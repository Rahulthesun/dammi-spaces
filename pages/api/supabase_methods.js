import { supabase } from "../../lib/supabaseClient"

//Function to GetProfile from Database given a User ID
export async function getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')         // or list specific fields like 'full_name, role'
      .eq('id', userId)    // match by id
      .single()            // ensures we only expect one row
  
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }
  
    return data // will be null if not found
}

export async function createProfile(userId) {
    const {error} = await supabase
        .from('profiles')
        .insert([
            {
                id:userId
            }
        ])

    if (error) return error

    return null
    
}