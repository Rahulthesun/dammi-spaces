// pages/api/signup.js
import { supabase } from '../../lib/supabaseClient'
import { createProfile } from './supabase_methods';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, full_name, role } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role },
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data.session) {
    console.log("Email confirmation required. No session created yet.");
  }

  const profileError = await createProfile(data.user.id)

  if (!profileError) {
    console.log("Successfully Created")
  } else {
    console.error("Error:" , profileError.message)
  }

  res.status(200).json({
    message: 'Signup successful. Check your email to confirm.',
    user: data.user,
    session: data.session,
  });
}
