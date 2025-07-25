// pages/api/login.js
import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Step 1: Email + password login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return res.status(401).json({ error: 'Invalid credentials', details: loginError.message });
  }

  // Step 2: Send OTP
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    }
  });

  if (otpError) {
    return res.status(500).json({ error: 'Login success, but failed to send OTP', details: otpError.message });
  }

  return res.status(200).json({
    message: 'Login success, OTP sent to email.',
    session: loginData.session,
    user: loginData.user,
  });
}
