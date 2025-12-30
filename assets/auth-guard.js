import { supabase } from "./supabase.js";

export async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    // กลับหน้า gate
    window.location.href = "index.html";
    return null;
  }
  return session;
}
