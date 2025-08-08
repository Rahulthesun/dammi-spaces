import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
})

// Set a custom quota in bytes (e.g., 10 GB)
const R2_TOTAL_QUOTA = 10 * 1024 * 1024 * 1024 // 10 GB

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // List all assets and return storage info
    try {
      const data = await s3.listObjectsV2({
        Bucket: process.env.R2_BUCKET_NAME,
      }).promise()
      const assets = (data.Contents || []).map(obj => ({
        key: obj.Key,
        url: `${process.NEXT_PUBLIC_R2_PUBLIC_URL}/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified,
      }))
      const totalUsed = assets.reduce((sum, a) => sum + (a.size || 0), 0)
      const numFiles = assets.length
      res.status(200).json({
        assets,
        storage: {
          used: totalUsed,
          quota: R2_TOTAL_QUOTA,
          numFiles,
        },
        r2: {
          bucket: process.env.R2_BUCKET_NAME,
          endpoint: process.env.R2_ENDPOINT,
        },
      })
    } catch (error) {
      res.status(500).json({ error: 'Failed to list assets', details: error.message })
    }
  } else if (req.method === 'DELETE') {
    // Delete an asset by key
    const { key } = req.query
    if (!key) return res.status(400).json({ error: 'Missing asset key' })
    try {
      await s3.deleteObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }).promise()
      res.status(200).json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete asset', details: error.message })
    }
  } else if (req.method === 'PUT') {
    // Rename an asset (copy then delete)
    const { oldKey, newKey } = req.body
    if (!oldKey || !newKey) return res.status(400).json({ error: 'Missing oldKey or newKey' })
    try {
      // Copy the object
      await s3.copyObject({
        Bucket: process.env.R2_BUCKET_NAME,
        CopySource: `/${process.env.R2_BUCKET_NAME}/${oldKey}`,
        Key: newKey,
        ACL: 'public-read',
      }).promise()
      // Delete the old object
      await s3.deleteObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: oldKey,
      }).promise()
      res.status(200).json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to rename asset', details: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 