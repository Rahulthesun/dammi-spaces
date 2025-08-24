// pages/api/login.js
import { supabase } from '../../lib/supabaseClient'
import { createProfile, getProfile } from './supabase_methods';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Sign in with email and password
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return res.status(401).json({ error: 'Invalid credentials', details: loginError.message });
  }

  // Check if profile exists, create if it doesn't
  const profile = await getProfile(loginData.user.id);

  if (!profile) {
    const profileError = await createProfile(loginData.user.id);
    if (!profileError) {
      console.log("Successfully Created Profile");
    } else {
      console.error("Error:", profileError.message);
    }
  } else {
    console.log("Profile Exists");
  }

  return res.status(200).json({
    message: 'Login successful',
    session: loginData.session,
    user: loginData.user,
  });
}