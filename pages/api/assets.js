import AWS from 'aws-sdk'
import { supabase } from '../../lib/supabaseClient'

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
})

export const config = {
  runtime: 'edge',
};

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
        url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified,
      }))

      //To Fetch Access Token Stored in Session & Use it to get user ID
      const token = req.headers.authorization?.split('Bearer')[1].trim() //Sometimes , a leading or trailing space gives a error 
      if (!token) return res.status(401).json({ error: 'No token provided' })
      const {
        data: {user},
        error: authError
      } = await supabase.auth.getUser(token)

      if (authError || !user){

        console.log(authError)
        console.log(user)
  
        return res.status(401).json({ error: 'Invalid token' })
      }
        
 
      const { data:supabaseData , error} = await supabase.from('images').select("*").eq("user_id" ,user.id);

      if (error) {
        console.error("Error" , error.message)
      }

      const userAssets = (supabaseData || []).map(img => ({
        key: img.name, // or whatever your column is called
        url: img.url, // adjust based on your storage setup
        thumbnail : img.thumbnail,
        size: img.size,
        lastModified: img.upload_date // adjust to your column name
      }));
      console.log(userAssets);

      const totalUsed = (supabaseData|| []).reduce((sum, a) => sum + (a.size || 0), 0);
      console.log(totalUsed);
      const numFiles =  (supabaseData || []).length;
      res.status(200).json({
        userAssets, 
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
      const {error:deleteError} =  await supabase.from('images').delete().eq('name', key);
      if (deleteError) {
        console.error("Error Deleting: " , deleteError)
      }
      console.log("Deleted from supabase")

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
    
    const {error:updateError} =  await supabase

    .from('images')
    .update({
      name: newKey,
      url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${newKey}`
    })
    .eq('name', oldKey);

    if (updateError) {
      console.error("Error Updating: " , updateError)
    }
    
    console.log("Updated from supabase")
    
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