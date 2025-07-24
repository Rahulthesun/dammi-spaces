import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Handle the OAuth callback
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // Successful sign in
        router.push('/dashboard') // Redirect to your protected page
      } else if (event === 'SIGNED_OUT') {
        // Handle sign out if needed
      } else if (event === 'USER_UPDATED') {
        // Handle user updates
      }
    })
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p>Please wait while we verify your credentials.</p>
      </div>
    </div>
  )
}