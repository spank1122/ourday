import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://fmukqdezvgrtatvbyclx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_OoAcw3AXQiCMXqQHyC4y7Q_OI4jG6pI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
