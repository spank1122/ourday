import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ✅ ใส่ของจริงจาก Supabase Project Settings → API
export const SUPABASE_URL = "https://fmukqdezvgrtatvbyclx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_OoAcw3AXQiCMXqQHyC4y7Q_OI4jG6pI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});




