import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { filename, contentType } = req.body;
  if (!filename || !contentType) return res.status(400).json({ error: 'Missing parameters' });

  const signedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    ContentType: contentType,
    ACL: 'public-read',
    Expires: 60, // 1 minute
  });

  res.status(200).json({ url: signedUrl, publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filename}` });
}
