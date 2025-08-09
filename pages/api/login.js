// pages/api/login.js
import { supabase } from '../../lib/supabaseClient'
import { createProfile, getProfile } from './supabase_methods';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, otp, step } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Step 1: Email + password verification (don't create session yet)
  if (step === 'verify_password' || (!step && password)) {
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify credentials without creating a session
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return res.status(401).json({ error: 'Invalid credentials', details: loginError.message });
    }

    // Sign out immediately to prevent session creation
    await supabase.auth.signOut();

    // Now send OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    });

    if (otpError) {
      return res.status(500).json({ 
        error: 'Password verified, but failed to send OTP', 
        details: otpError.message 
      });
    }

    return res.status(200).json({
      message: 'Password verified. OTP sent to email.',
      nextStep: 'verify_otp'
    });
  }

  // Step 2: OTP verification
  if (step === 'verify_otp' || otp) {
    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });



    if (error) {
      return res.status(401).json({ error: 'Invalid OTP', details: error.message });
    }

    const profile = await getProfile(data.user.id)

    if (!profile) {

       const profileError = await createProfile(data.user.id)
       if(!profileError) {
        console.log("Successfully Created Profile")
       } else {
        console.error("Error :" , profileError.message)
       }

    } else {
      console.log("Profile Exists")
    }

    return res.status(200).json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
    });

    

  }

  return res.status(400).json({ error: 'Invalid request. Specify step or provide password/otp.' });
}