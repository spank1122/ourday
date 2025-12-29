// assets/goals.js
import { supabase } from "./supabase.js";

// NOTE: หน้านี้สมมติว่า “ผ่าน gate แล้ว” ถึงเข้ามาได้
// ถ้ายังไม่ทำ auth-guard เดี๋ยวเราค่อยเพิ่มไฟล์ guard กลางทีหลังได้

const ui = {
  title: document.getElementById("gTitle"),
  target: document.getElementById("gTarget"),
  date: document.getElementById("gDate"),
  note: document.getElementById("gNote"),
  btnCreate: document.getElementById("btnCreate"),
  msg: document.getElementById("msg"),
  list: document.getElementById("goalList"),
};

function setMsg(text, ok = false){
  ui.msg.textContent = text || "";
  ui.msg.classList.toggle("ok", !!ok);
}

function fmtMoney(n){
  const x = Number(n || 0);
  return x.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function pill(status){
  if (status === "success") return `<span class="pill success">สำเร็จ ✅</span>`;
  if (status === "failed") return `<span class="pill failed">ไม่สำเร็จ 🥺</span>`;
  return `<span class="pill">กำลังทำ 💗</span>`;
}

async function getMe(){
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

// รวมยอดออมของ goal นี้ (เพื่อโชว์ “ยังขาดอีกเท่าไหร่”)
async function getSavedSum(goalId){
  const { data, error } = await supabase
    .from("savings_ledger")
    .select("amount")
    .eq("goal_id", goalId);

  if (error) return 0;
  return (data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
}

async function loadGoals(){
  ui.list.innerHTML = "";

  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error){
    ui.list.innerHTML = `<div class="goal-item">โหลด Goals ไม่ได้: ${error.message}</div>`;
    return;
  }

  if (!goals?.length){
    ui.list.innerHTML = `<div class="goal-item">ยังไม่มีเป้าหมายเลย 🥺 เพิ่มอันแรกได้เลยน้า</div>`;
    return;
  }

  // render พร้อมข้อมูล “ยังขาดอีกเท่าไหร่”
  for (const g of goals){
    const saved = await getSavedSum(g.id);
    const target = Number(g.target_amount || 0);
    const remain = Math.max(0, target - saved);

    const el = document.createElement("div");
    el.className = "goal-item";
    el.innerHTML = `
      <div class="goal-top">
        <div class="goal-title">${escapeHtml(g.title)}</div>
        ${pill(g.status)}
      </div>

      <div class="goal-meta">
        <div>🎯 เป้าหมาย: <b>${fmtMoney(target)}</b> บาท</div>
        <div>💰 ออมแล้ว: <b>${fmtMoney(saved)}</b> บาท</div>
        <div>🧾 ยังขาดอีก: <b>${fmtMoney(remain)}</b> บาท</div>
        <div>📅 กำหนด: <b>${escapeHtml(g.target_date)}</b></div>
      </div>

      ${g.note ? `<div style="margin-top:10px;color:rgba(26,37,47,.7);font-weight:700;">📝 ${escapeHtml(g.note)}</div>` : ""}

      <div class="goal-actions">
        <button class="btn btn-soft" data-act="success" data-id="${g.id}">ติ๊ก “สำเร็จ” ✅</button>
        <button class="btn btn-soft" data-act="failed" data-id="${g.id}">ติ๊ก “ไม่สำเร็จ” 🥺</button>
        <button class="btn btn-soft" data-act="ongoing" data-id="${g.id}">กลับเป็น “กำลังทำ” 💗</button>
      </div>
    `;
    ui.list.appendChild(el);
  }
}

async function createGoal(){
  const me = await getMe();
  if (!me){
    setMsg("ยังไม่ได้ล็อกอิน", false);
    return;
  }

  const title = (ui.title.value || "").trim();
  const target_amount = Number(ui.target.value || 0);
  const target_date = ui.date.value;
  const note = (ui.note.value || "").trim();

  if (!title) return setMsg("กรอกชื่อเป้าหมายก่อนน้า", false);
  if (!target_date) return setMsg("เลือกวันครบกำหนดก่อนน้า", false);

  ui.btnCreate.disabled = true;
  setMsg("กำลังบันทึก...", true);

  // 1) insert goals
  const { data: g, error: e1 } = await supabase
    .from("goals")
    .insert([{ title, target_amount, target_date, note }])
    .select()
    .single();

  if (e1){
    ui.btnCreate.disabled = false;
    return setMsg("บันทึกไม่สำเร็จ: " + e1.message, false);
  }

  // 2) ให้ goal นี้มีเจ้าของร่วม 2 คนเสมอ:
  // - วิธีง่ายสุดตอนนี้: ใส่ “คนที่ล็อกอิน” เป็น member ก่อน
  // - อีกคน เราจะเติมทีหลังจากอีเมล/ชื่อ (เดี๋ยวค่อยผูก role/คู่จริง)
  await supabase.from("goal_members").insert([
    { goal_id: g.id, user_id: me.id, display_name: me.email || "me" },
  ]);

  ui.btnCreate.disabled = false;
  ui.title.value = "";
  ui.target.value = "";
  ui.date.value = "";
  ui.note.value = "";

  setMsg("เพิ่ม Goal แล้ว 💗", true);
  await loadGoals();
}

async function setStatus(goalId, status){
  const { error } = await supabase
    .from("goals")
    .update({ status })
    .eq("id", goalId);

  if (error) return setMsg("อัปเดตไม่สำเร็จ: " + error.message, false);

  setMsg("อัปเดตสถานะแล้ว ✨", true);
  await loadGoals();
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// events
ui.btnCreate.addEventListener("click", createGoal);

ui.list.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const act = btn.getAttribute("data-act");
  const id = btn.getAttribute("data-id");
  if (!id) return;
  setStatus(id, act);
});

// init
loadGoals();
