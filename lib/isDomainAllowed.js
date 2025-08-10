// utils/isDomainAllowed.js
import { supabase } from '../lib/supabaseClient.js';

export async function isDomainAllowed(businessId, origin) {
  const { data, error } = await supabase
    .from('widget_domains')
    .select('domain')
    .eq('business_id', businessId);

  if (error) {
    console.error('Error fetching widget domains:', error);
    return false;
  }

  const allowedDomains = data.map(row => row.domain);
  return allowedDomains.includes(origin);
}
