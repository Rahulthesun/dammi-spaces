//add profile via api
import { upsertProfile } from '../../lib/upsertProfile'



export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, full_name, role, access_token } = req.body;
  if (!id || !full_name || !role || !access_token) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await upsertProfile({ id, full_name, role, access_token });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upsert profile', details: error.message });
  }
}
