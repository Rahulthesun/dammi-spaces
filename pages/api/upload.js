import formidable from 'formidable'
import AWS from 'aws-sdk'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import ffmpeg from 'fluent-ffmpeg'
//import ffmpegPath from '@ffmpeg-installer/ffmpeg'
//import ffprobePath from '@ffprobe-installer/ffprobe'
import { path as ffmpegPath } from 'ffmpeg-static'
import { path as ffprobePath } from 'ffprobe-static'
//ffmpeg.setFfprobePath(ffprobePath.path)


//ffmpeg.setFfmpegPath(ffmpegPath.path)

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.headers.authorization?.split('Bearer')[1]?.trim()
    if (!token) return res.status(401).json({ error: 'No token provided' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const form = formidable({
      maxFileSize: 100 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: process.env.TEMP || process.env.TMP || '/tmp',
      multiples: true
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        resolve([fields, files])
      })
    })

    let uploadedFiles = []
    if (files.files) {
      if (Array.isArray(files.files)) {
        uploadedFiles = files.files.filter(f => f && f.mimetype)
      } else if (files.files.mimetype) {
        uploadedFiles = [files.files]
      }
    }

    if (uploadedFiles.length === 0) {
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
      const isImage = allowedImageTypes.includes(file.mimetype)
      const isVideo = allowedVideoTypes.includes(file.mimetype)

      if (!isImage && !isVideo) {
        fs.unlinkSync(file.filepath)
        return res.status(400).json({ error: 'Invalid file type' })
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = path.extname(file.originalFilename)
      const filename = `${timestamp}-${randomString}${extension}`
      const uploadPath = file.filepath

      // Insert metadata in Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('images')
        .insert([{
          name: filename,
          url: null,
          thumbnail: null, // new field
          upload_date: new Date(),
          user_id: user.id,
          size: file.size,
        }])
        .select()
        .single()

      if (insertError || !insertedData) {
        fs.unlinkSync(uploadPath)
        return res.status(500).json({ error: 'Failed to save metadata' })
      }

      try {
        // Upload main file
        const fileStream = fs.createReadStream(uploadPath)
        await s3.upload({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
          Body: fileStream,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }).promise()

        const fileUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filename}`

        // If it's a video, create a thumbnail
        let thumbnailUrl = null
        if (isVideo) {
          const thumbnailFilename = `${timestamp}-${randomString}-thumb.jpg`
          const thumbnailPath = path.join(
            process.env.TEMP || process.env.TMP || '/tmp',
            thumbnailFilename
          )

          await new Promise((resolve, reject) => {
            ffmpeg(uploadPath)
              .screenshots({
                timestamps: ['1'], // capture at 1 second
                filename: thumbnailFilename,
                folder: path.dirname(thumbnailPath)
              })
              .on('end', resolve)
              .on('error', reject)
          })

          // Upload thumbnail to R2
          const thumbStream = fs.createReadStream(thumbnailPath)
          await s3.upload({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbnailFilename,
            Body: thumbStream,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
          }).promise()

          thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailFilename}`
          fs.unlinkSync(thumbnailPath)
        }

        // Update Supabase with file URL and optional thumbnail URL
        const { error: updateError } = await supabase
          .from('images')
          .update({ url: fileUrl, thumbnail: thumbnailUrl })
          .eq('id', insertedData.id)

        if (updateError) {
          await supabase.from('images').delete().eq('id', insertedData.id)
          fs.unlinkSync(uploadPath)
          return res.status(500).json({ error: 'Failed to update metadata' })
        }

        results.push({
          success: true,
          url: fileUrl,
          thumbnail: thumbnailUrl,
          filename,
          size: file.size,
          type: file.mimetype,
        })
      } catch (uploadError) {
        await supabase.from('images').delete().eq('id', insertedData.id)
        fs.unlinkSync(uploadPath)
        return res.status(500).json({ error: 'File upload failed' })
      }

      fs.unlinkSync(uploadPath)
    }

    res.status(200).json(results)
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
