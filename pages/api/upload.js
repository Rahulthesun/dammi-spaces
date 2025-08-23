import formidable from 'formidable';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// R2 (S3-compatible)
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
});

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- Authentication ---
    const token = req.headers.authorization?.split('Bearer')[1]?.trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    // --- Parse upload ---
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: process.env.TEMP || process.env.TMP || '/tmp',
      multiples: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // --- Handle files and optional thumbnails ---
    const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
    const uploadedThumbnails = files.thumbnails
      ? (Array.isArray(files.thumbnails) ? files.thumbnails : [files.thumbnails])
      : [];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No valid files uploaded' });
    }

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

    const results = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const isImage = allowedImageTypes.includes(file.mimetype);
      const isVideo = allowedVideoTypes.includes(file.mimetype);

      if (!isImage && !isVideo) {
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ error: 'Invalid file type' });
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(file.originalFilename);
      const filename = `${timestamp}-${randomString}${extension}`;
      const uploadPath = file.filepath;

      // Insert metadata in Supabase (empty URLs first)
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
        .single();

      if (insertError || !insertedData) {
        fs.unlinkSync(uploadPath);
        return res.status(500).json({ error: 'Failed to save metadata' });
      }

      try {
        // --- Upload original file to R2 ---
        const fileStream = fs.createReadStream(uploadPath);
        await s3.upload({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
          Body: fileStream,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }).promise();

        const fileUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filename}`;

        // --- Upload thumbnail if present ---
        let thumbnailUrl = null;
        const thumbnailFile = uploadedThumbnails[i];
        if (thumbnailFile) {
          const thumbStream = fs.createReadStream(thumbnailFile.filepath);
          const thumbKey = `thumb-${timestamp}-${randomString}.jpg`;

          await s3.upload({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: thumbKey,
            Body: thumbStream,
            ContentType: thumbnailFile.mimetype,
            ACL: 'public-read',
          }).promise();

          thumbnailUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbKey}`;
          fs.unlinkSync(thumbnailFile.filepath);
        }

        // --- Update Supabase ---
        const { error: updateError } = await supabase
          .from('images')
          .update({ url: fileUrl, thumbnail: thumbnailUrl })
          .eq('id', insertedData.id);

        if (updateError) {
          await supabase.from('images').delete().eq('id', insertedData.id);
          fs.unlinkSync(uploadPath);
          return res.status(500).json({ error: 'Failed to update metadata in Supabase' });
        }

        results.push({
          success: true,
          url: fileUrl,
          thumbnail: thumbnailUrl,
          filename,
          size: file.size,
          type: file.mimetype,
        });

      } catch (uploadError) {
        await supabase.from('images').delete().eq('id', insertedData.id);
        fs.unlinkSync(uploadPath);
        console.error(uploadError);
        return res.status(500).json({ error: 'File upload failed during R2 upload' });
      }

      fs.unlinkSync(uploadPath); // cleanup temp file
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
