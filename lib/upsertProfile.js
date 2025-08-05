import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function upsertProfile({ id, full_name, role, access_token }) {
  // Create authenticated client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  });

  try {
    // First verify the token matches the user ID
    const { data: { user } } = await supabase.auth.getUser(access_token);
    
    if (user.id !== id) {
      throw new Error('User ID does not match JWT sub claim');
    }

    // Upsert with select to return the inserted data
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id,
        full_name,
        role,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return { message: 'Profile upserted successfully', data };
  } catch (error) {
    console.error('Error upserting profile:', error);
    throw new Error(error.message || 'Failed to upsert profile');
  }
}