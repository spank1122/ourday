import { supabase } from "./supabase.js";
import { requireAuth } from "./auth-guard.js";

const ui = {
  fill: document.getElementById("waterFill"),
  totalValue: document.getElementById("totalValue"),
  moneyGoalsCount: document.getElementById("moneyGoalsCount"),
  moneyTargetSum: document.getElementById("moneyTargetSum"),
  moneyRemaining: document.getElementById("moneyRemaining"),
  hint: document.getElementById("hint"),

  modeTotal: document.getElementById("modeTotal"),
  modeGoal: document.getElementById("modeGoal"),
  goalWrap: document.getElementById("goalPickWrap"),
  goalSelect: document.getElementById("goalSelect"),

  amount: document.getElementById("amount"),
  date: document.getElementById("date"),
  note: document.getElementById("note"),
  btnSave: document.getElementById("btnSave"),
  msg: document.getElementById("msg"),
  ledger: document.getElementById("ledger"),
};

let mode = "total"; // total | goal
let moneyGoals = [];
let sessionCache = null;

function setMsg(t){ ui.msg.textContent = t || ""; }

function fmt(n){
  const x = Number(n || 0);
  return x.toLocaleString("th-TH");
}

function setMode(next){
  mode = next;
  if (mode === "total"){
    ui.modeTotal.className = "btn btn-primary";
    ui.modeGoal.className = "btn btn-soft";
    ui.goalWrap.style.display = "none";
  }else{
    ui.modeTotal.className = "btn btn-soft";
    ui.modeGoal.className = "btn btn-primary";
    ui.goalWrap.style.display = "block";
  }
}

async function loadMoneyGoals(){
  const { data, error } = await supabase
    .from("goals")
    .select("id,title,target_amount,target_date,goal_type,status")
    .eq("goal_type", "money")
    .order("created_at", { ascending: false });

  if (error) throw error;
  moneyGoals = (data || []).filter(g => (g.status || "active") !== "failed"); // กัน goal failed ก็ได้

  ui.goalSelect.innerHTML = moneyGoals.map(g => {
    const due = g.target_date ? ` (${g.target_date})` : "";
    return `<option value="${g.id}">${escapeHtml(g.title)}${due}</option>`;
  }).join("");

  return moneyGoals;
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function loadTotals(){
  // sum savings_ledger
  const { data: led, error: ledErr } = await supabase
    .from("savings_ledger")
    .select("amount");

  if (ledErr) throw ledErr;

  const totalSaved = (led || []).reduce((a, r) => a + Number(r.amount || 0), 0);

  const targets = moneyGoals
    .map(g => Number(g.target_amount || 0))
    .filter(x => x > 0);

  const totalTarget = targets.reduce((a,b) => a + b, 0);
  const remaining = Math.max(0, totalTarget - totalSaved);

  ui.totalValue.textContent = `${fmt(totalSaved)} ฿`;
  ui.moneyGoalsCount.textContent = String(moneyGoals.length);
  ui.moneyTargetSum.textContent = fmt(totalTarget);
  ui.moneyRemaining.textContent = fmt(remaining);

  // water fill
  let pct = 0;
  if (totalTarget > 0) pct = Math.max(0, Math.min(100, (totalSaved / totalTarget) * 100));
  ui.fill.style.height = `${pct}%`;

  if (totalTarget <= 0){
    ui.hint.textContent = "ยังไม่มี Goal การเงินที่ตั้งยอดเป้าหมายไว้เลยน้า 💗";
  }else{
    ui.hint.textContent = `ตอนนี้ถึงแล้ว ${pct.toFixed(0)}% ✨ เหลืออีก ${fmt(remaining)} บาท`;
  }
}

async function loadLedger(){
  const { data, error } = await supabase
    .from("savings_ledger")
    .select("id,amount,note,saved_at,created_at,goal_id,user_id")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  ui.ledger.innerHTML = (data || []).map(r => {
    const d = r.saved_at || (r.created_at ? String(r.created_at).slice(0,10) : "");
    const note = r.note ? `• ${escapeHtml(r.note)}` : "";
    return `
      <div class="glass" style="border-radius:16px; padding:12px; display:flex; justify-content:space-between; gap:12px;">
        <div style="font-weight:900; color:rgba(255,94,154,.9);">+ ${fmt(r.amount)} ฿</div>
        <div style="color:rgba(26,37,47,.55); font-weight:800;">${d} ${note}</div>
      </div>
    `;
  }).join("");

  if (!data?.length){
    ui.ledger.innerHTML = `<div style="color:rgba(26,37,47,.55); font-weight:800;">ยังไม่มีรายการออมเลย</div>`;
  }
}

async function save(){
  const session = sessionCache || await requireAuth();
  if (!session) return;
  sessionCache = session;

  const amount = Number(ui.amount.value || 0);
  const saved_at = ui.date.value || new Date().toISOString().slice(0,10);
  const note = (ui.note.value || "").trim() || null;

  if (!amount || amount <= 0){
    return setMsg("จำนวนเงินต้องมากกว่า 0 นะ");
  }

  let goal_id = null;
  if (mode === "goal"){
    goal_id = ui.goalSelect.value || null;
    if (!goal_id) return setMsg("เลือก Goal ก่อนนะ");
  }

  ui.btnSave.disabled = true;
  ui.btnSave.textContent = "กำลังบันทึก...";
  setMsg("");

  try{
    const { error } = await supabase
      .from("savings_ledger")
      .insert([{
        goal_id,
        user_id: session.user.id,
        amount,
        note,
        saved_at,
      }]);

    if (error) throw error;

    ui.amount.value = "";
    ui.note.value = "";
    setMsg("บันทึกแล้ว 💗");

    // refresh
    await loadLedger();
    await loadTotals();
  }catch(err){
    setMsg("บันทึกไม่สำเร็จ: " + (err?.message || String(err)));
  }finally{
    ui.btnSave.disabled = false;
    ui.btnSave.textContent = "+ บันทึก";
  }
}

async function init(){
  const session = await requireAuth();
  if (!session) return;
  sessionCache = session;

  // default today
  ui.date.value = new Date().toISOString().slice(0,10);

  setMode("total");

  // load goals + totals + ledger
  await loadMoneyGoals();
  await loadTotals();
  await loadLedger();
}

ui.modeTotal.addEventListener("click", () => setMode("total"));
ui.modeGoal.addEventListener("click", () => setMode("goal"));
ui.btnSave.addEventListener("click", save);

document.addEventListener("DOMContentLoaded", init);
