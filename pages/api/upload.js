import formidable from 'formidable'
import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobePath from 'ffprobe-static'



ffmpeg.setFfprobePath(ffprobePath)
ffmpeg.setFfmpegPath(ffmpegPath)


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const config = {
  api: {
    bodyParser: false,
  },
}

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
})

export default async function handler(req, res) {
  console.log('✅ Incoming request:', req.method, req.url)

  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight request detected')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    console.warn('❌ Invalid method:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // ✅ Extract token
    const token = req.headers.authorization?.split('Bearer')[1]?.trim()
    console.log('🔍 Token present?', !!token)
    if (!token) return res.status(401).json({ error: 'No token provided' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.warn('❌ Auth failed:', authError)
      return res.status(401).json({ error: 'Invalid token' })
    }
    console.log('✅ Authenticated user:', user.id)

    // ✅ Parse form data
    console.log('📦 Parsing form data...')
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      keepExtensions: true,
      uploadDir: process.env.TEMP || process.env.TMP || '/tmp',
      multiples: true
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('❌ Form parse error:', err)
          reject(err)
        }
        console.log('✅ Form parsed. Fields:', fields)
        console.log('✅ Raw files:', files)
        resolve([fields, files])
      })
    })

    // ✅ Extract uploaded files
    let uploadedFiles = []
    if (files.files) {
      if (Array.isArray(files.files)) {
        uploadedFiles = files.files.filter(f => f && f.mimetype)
      } else if (files.files.mimetype) {
        uploadedFiles = [files.files]
      }
    }
    console.log('📂 Uploaded files count:', uploadedFiles.length)

    if (uploadedFiles.length === 0) {
      console.warn('❌ No valid files uploaded')
      return res.status(400).json({ error: 'No valid files uploaded' })
    }

    const allowedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'image/gif', 'image/webp'
    ]
    const allowedVideoTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ]

    const results = []

    for (const file of uploadedFiles) {
      console.log('🔍 Processing file:', file.originalFilename, file.mimetype)

      const isImage = allowedImageTypes.includes(file.mimetype)
      const isVideo = allowedVideoTypes.includes(file.mimetype)

      if (!isImage && !isVideo) {
        console.warn('❌ Invalid file type:', file.mimetype)
        fs.unlinkSync(file.filepath)
        return res.status(400).json({ error: 'Invalid file type' })
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = path.extname(file.originalFilename)
      const filename = `${timestamp}-${randomString}${extension}`
      const uploadPath = file.filepath

      console.log('📝 Generated filename:', filename)

      // ✅ Insert metadata in Supabase
      console.log('📤 Inserting metadata into Supabase...')
      const { data: insertedData, error: insertError } = await supabase
        .from('images')
        .insert([{
          name: filename,
          url: null,
          thumbnail: null,
          upload_date: new Date(),
          user_id: user.id,
          size: file.size,
        }])
        .select()
        .single()

      if (insertError || !insertedData) {
        console.error('❌ Failed to insert metadata:', insertError)
        fs.unlinkSync(uploadPath)
        return res.status(500).json({ error: 'Failed to save metadata' })
      }
      console.log('✅ Metadata inserted:', insertedData)

      try {
        // ✅ Upload file to S3
        console.log('📤 Uploading main file to S3...')
        const fileStream = fs.createReadStream(uploadPath)
        await s3.upload({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
          Body: fileStream,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }).promise()

        const fileUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filename}`
        console.log('✅ File uploaded to S3:', fileUrl)

        // ✅ Generate thumbnail for videos
        let thumbnailUrl = null
        if (isVideo) {
          console.log('🎞 Generating video thumbnail...')
          const thumbnailFilename = `${timestamp}-${randomString}-thumb.jpg`
          const thumbnailPath = path.join(
            process.env.TEMP || process.env.TMP || '/tmp',
            thumbnailFilename
          )

          await new Promise((resolve, reject) => {
            ffmpeg(uploadPath)
              .screenshots({
                timestamps: ['1'],
                filename: thumbnailFilename,
                folder: path.dirname(thumbnailPath)
              })
              .on('end', () => {
                console.log('✅ Thumbnail generated:', thumbnailFilename)
                resolve()
              })
              .on('error', (err) => {
                console.error('❌ Thumbnail generation error:', err)
                reject(err)
              })
          })

          console.log('📤 Uploading thumbnail to S3...')
          const thumbStream = fs.createReadStream(thumbnailPath)
          await s3.upload({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbnailFilename,
            Body: thumbStream,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
          }).promise()

          thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailFilename}`
          console.log('✅ Thumbnail uploaded:', thumbnailUrl)
          fs.unlinkSync(thumbnailPath)
        }

        // ✅ Update Supabase record
        console.log('📥 Updating Supabase with URLs...')
        const { error: updateError } = await supabase
          .from('images')
          .update({ url: fileUrl, thumbnail: thumbnailUrl })
          .eq('id', insertedData.id)

        if (updateError) {
          console.error('❌ Failed to update metadata:', updateError)
          await supabase.from('images').delete().eq('id', insertedData.id)
          fs.unlinkSync(uploadPath)
          return res.status(500).json({ error: 'Failed to update metadata' })
        }

        console.log('✅ Record updated successfully.')
        results.push({
          success: true,
          url: fileUrl,
          thumbnail: thumbnailUrl,
          filename,
          size: file.size,
          type: file.mimetype,
        })
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError)
        await supabase.from('images').delete().eq('id', insertedData.id)
        fs.unlinkSync(uploadPath)
        return res.status(500).json({ error: 'File upload failed' })
      }

      fs.unlinkSync(uploadPath)
      console.log('🗑 Temp file deleted:', uploadPath)
    }

    console.log('✅ All files processed successfully.')
    res.status(200).json(results)
  } catch (error) {
    console.error('❌ Upload error (outer catch):', error)
    res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
