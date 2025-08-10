// pages/api/signup.js
import { supabase } from '../../lib/supabaseClient'
import { createProfile } from './supabase_methods';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, full_name, role, token, step } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Step 1: Create account and send confirmation email (don't create profile yet)
  if (step === 'create_account' || (!step && password)) {
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Create user account (this sends confirmation email automatically)
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role }
        // No emailRedirectTo - we don't want clickable links
      }
    });

    if (signupError) {
      return res.status(400).json({ error: signupError.message });
    }

    // If session exists, sign out immediately (similar to your login API)
    if (signupData.session) {
      await supabase.auth.signOut();
    }

    return res.status(200).json({
      message: 'Account created. Confirmation token sent to email.',
      nextStep: 'verify_token'
    });
  }

  // Step 2: Token verification
  if (step === 'verify_token' || token) {
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email'
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }

    const profileError = await createProfile(data.user.id);

    if (!profileError) {
      console.log("Successfully Created Profile");
    } else {
      console.error("Error:", profileError.message);
    }

    return res.status(200).json({
      message: 'Signup successful',
      session: data.session,
      user: data.user,
    });
  }

  return res.status(400).json({ error: 'Invalid request. Specify step or provide password/token.' });
}