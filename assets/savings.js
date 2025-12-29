// assets/savings.js
import { supabase } from "./supabase.js";

const ui = {
  goalSelect: document.getElementById("goalSelect"),
  kTarget: document.getElementById("kTarget"),
  kSaved: document.getElementById("kSaved"),
  kRemain: document.getElementById("kRemain"),
  byPerson: document.getElementById("byPerson"),

  amt: document.getElementById("amt"),
  date: document.getElementById("date"),
  note: document.getElementById("note"),
  btnAdd: document.getElementById("btnAdd"),
  msg: document.getElementById("msg"),
  recent: document.getElementById("recent"),
};

function setMsg(text, ok=false){
  ui.msg.textContent = text || "";
  ui.msg.classList.toggle("ok", !!ok);
}

function fmtMoney(n){
  const x = Number(n || 0);
  return x.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " ฿";
}

async function getMe(){
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

async function loadGoalsIntoSelect(){
  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error){
    ui.goalSelect.innerHTML = `<option value="">โหลด Goals ไม่ได้</option>`;
    return;
  }

  if (!goals?.length){
    ui.goalSelect.innerHTML = `<option value="">ยังไม่มี Goal</option>`;
    return;
  }

  ui.goalSelect.innerHTML = goals.map(g => {
    const label = `${g.title} (${g.target_date})`;
    return `<option value="${g.id}" data-target="${g.target_amount}">${escapeHtml(label)}</option>`;
  }).join("");

  // default เลือกอันแรก
  ui.goalSelect.value = goals[0].id;
}

async function loadSummary(){
  const goalId = ui.goalSelect.value;
  if (!goalId) return;

  // 1) goal info
  const { data: goal, error: e1 } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (e1) return;

  // 2) ledger
  const { data: rows, error: e2 } = await supabase
    .from("savings_ledger")
    .select("amount, user_id, saved_at, note, created_at")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  const list = rows || [];
  const total = list.reduce((s,r)=> s + Number(r.amount||0), 0);
  const target = Number(goal.target_amount || 0);
  const remain = Math.max(0, target - total);

  ui.kTarget.textContent = fmtMoney(target);
  ui.kSaved.textContent = fmtMoney(total);
  ui.kRemain.textContent = fmtMoney(remain);

  // รวมตาม user
  const by = new Map();
  for (const r of list){
    const k = r.user_id;
    by.set(k, (by.get(k) || 0) + Number(r.amount || 0));
  }

  // โชว์ “ใครออมบ้าง” (ตอนนี้ใช้ user_id ก่อน / ถ้าจะให้สวย: map เป็นชื่อจาก role email ได้)
  const entries = [...by.entries()].sort((a,b)=> b[1]-a[1]);
  ui.byPerson.innerHTML = entries.length ? entries.map(([uid, sum]) => `
    <div class="item">
      <div class="left">👤 ${escapeHtml(shortId(uid))}</div>
      <div class="right">${fmtMoney(sum)}</div>
    </div>
  `).join("") : `<div class="item"><div class="left">ยังไม่มีใครออมเลย</div></div>`;

  // recent list
  ui.recent.innerHTML = list.slice(0, 8).map(r => `
    <div class="item">
      <div class="left">+ ${fmtMoney(r.amount)} <span style="font-weight:900;color:rgba(26,37,47,.55)">(${escapeHtml(r.saved_at)})</span></div>
      <div class="right">${escapeHtml(r.note || "")}</div>
    </div>
  `).join("") || `<div class="item"><div class="left">ยังไม่มีรายการออม</div></div>`;
}

async function addSaving(){
  const me = await getMe();
  if (!me) return setMsg("ยังไม่ได้ล็อกอิน", false);

  const goalId = ui.goalSelect.value;
  const amount = Number(ui.amt.value || 0);
  const saved_at = ui.date.value || new Date().toISOString().slice(0,10);
  const note = (ui.note.value || "").trim();

  if (!goalId) return setMsg("ยังไม่มี Goal", false);
  if (!amount || amount <= 0) return setMsg("กรอกจำนวนเงินก่อนน้า", false);

  ui.btnAdd.disabled = true;
  setMsg("กำลังบันทึก...", true);

  const { error } = await supabase
    .from("savings_ledger")
    .insert([{ goal_id: goalId, user_id: me.id, amount, saved_at, note }]);

  ui.btnAdd.disabled = false;

  if (error) return setMsg("บันทึกไม่สำเร็จ: " + error.message, false);

  ui.amt.value = "";
  ui.note.value = "";
  setMsg("บันทึกแล้ว 💗", true);
  await loadSummary();
}

function shortId(id){
  const s = String(id || "");
  return s ? (s.slice(0, 6) + "..." + s.slice(-4)) : "unknown";
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// init
ui.btnAdd.addEventListener("click", addSaving);
ui.goalSelect.addEventListener("change", loadSummary);

(async function init(){
  // default date today
  ui.date.value = new Date().toISOString().slice(0,10);

  await loadGoalsIntoSelect();
  await loadSummary();
})();
