import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Returns the current expiry window in days, falling back to 90 if unset/invalid.
// Read at send time so emails always reflect the admin panel's current value.
export async function getExpiryDays() {
  try {
    const { data } = await supabase
      .from('settings').select('value').eq('key', 'expiry_days').single();
    const n = parseInt(data?.value);
    return Number.isFinite(n) && n > 0 ? n : 90;
  } catch { return 90; }
}
