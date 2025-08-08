import formidable from 'formidable'
import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Disable default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
}

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto', // R2 doesn't use regions like S3
  s3ForcePathStyle: true, // Required for R2
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    
    const token = req.headers.authorization?.split('Bearer')[1]
    if (!token) return res.status(401).json({ error: 'No token provided' })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

    // Parse the form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
      keepExtensions: true,
      uploadDir: process.env.TEMP || process.env.TMP || './tmp',
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const file = files.file?.[0] || files.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ]
    const allowedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
    ]
    const isImage = allowedImageTypes.includes(file.mimetype)
    const isVideo = allowedVideoTypes.includes(file.mimetype)

    if (!isImage && !isVideo) {
      // Clean up uploaded file
      fs.unlinkSync(file.filepath)
      return res.status(400).json({ error: 'Invalid file type. Only images and videos are allowed.' })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = path.extname(file.originalFilename)
    const filename = `${timestamp}-${randomString}${extension}`
    const uploadPath = file.filepath
    const contentType = file.mimetype

    // Read file stream
    const fileStream = fs.createReadStream(uploadPath)

    // Upload to R2
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: fileStream,
      ContentType: contentType,
      ACL: 'public-read', // Make file publicly accessible
    }

    const uploadResult = await s3.upload(uploadParams).promise()

    // Insert image metadata into Supabase
    const { error } = await supabase.from('images').insert([
      {
        name: filename,
        url: uploadResult.Location,
        upload_date: new Date(),
        user_id: user.id,
      },
    ])

    if (error) {
      console.error(' Failed to insert image metadata into Supabase:', error.message)
    }


    // Clean up temporary file
    fs.unlinkSync(uploadPath)

    // Return success response
    res.status(200).json({
      success: true,
      url: uploadResult.Location,
      filename: filename,
      size: file.size,
      type: contentType,
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    // Clean up any temporary files if they exist
    if (error.filepath && fs.existsSync(error.filepath)) {
      fs.unlinkSync(error.filepath)
    }

    res.status(500).json({
      error: 'Upload failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
} 