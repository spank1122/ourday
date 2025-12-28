import { supabase } from "./supabase.js";

const ROLE_BY_EMAIL = {
  // ใส่อีเมลจริงทีหลัง
  "game@example.com": { id:"game", name:"หมูอ้วน (เกม)" },
  "pompam@example.com": { id:"pompam", name:"หมูจิ๋ว (พอมแพม)" },
};

const GATE_CODE = "131024"; // 6 หลัก (DDMMYY)

const ui = {
  authWrap: document.getElementById("authWrap"),
  gateWrap: document.getElementById("gateWrap"),
  who: document.getElementById("who"),
  status: document.getElementById("status"),
  email: document.getElementById("email"),
  btnGoogle: document.getElementById("btnGoogle"),
  btnEmail: document.getElementById("btnEmail"),
  btnLogout: document.getElementById("btnLogout"),
  gateHint: document.getElementById("gateHint"),
};

function setStatus(msg){ ui.status.textContent = msg || ""; }

function getRole(session){
  const email = session?.user?.email?.toLowerCase() || "";
  return ROLE_BY_EMAIL[email] || { id:"unknown", name: email ? `ผู้ใช้: ${email}` : "ผู้ใช้" };
}

async function refreshUI(){
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  // ===== NOT LOGGED IN =====
  if (!session){
    ui.authWrap.style.display = "block";
    ui.gateWrap.style.display = "none";
    ui.btnLogout.style.display = "none";
    ui.who.textContent = "ยังไม่ได้ล็อกอิน";
    if (ui.gateHint) ui.gateHint.style.display = "none"; // ✅ ซ่อนข้อความรหัส
    return;
  }

  // ===== LOGGED IN =====
  const role = getRole(session);
  ui.who.textContent = `สวัสดี ${role.name} 💗`;
  ui.btnLogout.style.display = "inline-flex";

  // If gate already passed for this user -> go main
  const passedKey = `gate_passed_${session.user.id}`;
  if (sessionStorage.getItem(passedKey) === "true"){
    window.location.href = "main.html";
    return;
  }

  // Show gate UI
  ui.authWrap.style.display = "none";
  ui.gateWrap.style.display = "block";

  // ✅ โชว์ข้อความรหัสหลังล็อกอินเท่านั้น
  if (ui.gateHint) ui.gateHint.style.display = "block";

  window.__GATE__ = {
    sessionUserId: session.user.id,
    passedKey,
    gateCode: GATE_CODE
  };
}

async function signInGoogle(){
  setStatus("กำลังเปิด Google Login...");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname.replace(/[^\/]+$/, "index.html")
    }
  });
  if (error) setStatus("Login ไม่สำเร็จ: " + error.message);
}

async function signInEmail(){
  const email = (ui.email.value || "").trim();
  if (!email) return setStatus("กรอกอีเมลก่อนน้า");
  setStatus("กำลังส่งลิงก์เข้าใช้งานไปที่อีเมล...");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname.replace(/[^\/]+$/, "index.html")
    }
  });
  if (error) setStatus("ส่งลิงก์ไม่สำเร็จ: " + error.message);
  else setStatus("เช็กอีเมลแล้วกดลิงก์เพื่อเข้าเว็บ 💌");
}

async function logout(){
  await supabase.auth.signOut();
  setStatus("");
  await refreshUI();
}

ui.btnGoogle?.addEventListener("click", signInGoogle);
ui.btnEmail?.addEventListener("click", signInEmail);
ui.btnLogout?.addEventListener("click", logout);

supabase.auth.onAuthStateChange((_event, _session) => {
  refreshUI();
});

window.addEventListener("DOMContentLoaded", refreshUI);
