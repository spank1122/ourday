// assets/goals.js
import { supabase } from "./supabase.js";

const ui = {
  grid: document.getElementById("goalsGrid"),

  addModal: document.getElementById("addModal"),
  btnOpenAdd: document.getElementById("btnOpenAdd"),
  btnAddSave: document.getElementById("btnAddSave"),
  addMsg: document.getElementById("addMsg"),

  gTitle: document.getElementById("gTitle"),
  gType: document.getElementById("gType"),
  gDue: document.getElementById("gDue"),
  gTarget: document.getElementById("gTarget"),
  gNoteShort: document.getElementById("gNoteShort"),
  gNote: document.getElementById("gNote"),
  moneyRow: document.getElementById("moneyRow"),
  typeHint: document.getElementById("typeHint"),

  detailModal: document.getElementById("detailModal"),
  dTitle: document.getElementById("dTitle"),
  dMeta: document.getElementById("dMeta"),
  dNote: document.getElementById("dNote"),
  detailMsg: document.getElementById("detailMsg"),
  btnDetailSave: document.getElementById("btnDetailSave"),
};

let session = null;
let goals = [];
let selectedGoal = null;
let selectedStatus = "in_progress";

function msg(el, text, type){
  if (!text){ el.innerHTML = ""; return; }
  el.innerHTML = `<div class="${type||"err"}">${text}</div>`;
}

function moneyRowToggle(){
  const t = ui.gType.value;
  if (t === "money"){
    ui.moneyRow.style.display = "grid";
    ui.typeHint.textContent = "เลือก “การเงิน” → จะถูกเอาไปใช้ในหน้า Savings ได้";
  } else {
    ui.moneyRow.style.display = "none";
    ui.typeHint.textContent = "ถ้าเลือก “ทั่วไป” → จะไม่ให้เอาไปเลือกออมใน Savings";
  }
}

function fmt(n){
  const x = Number(n || 0);
  return x.toLocaleString("th-TH");
}

function badgeText(goal){
  if (goal.status === "success") return "สำเร็จ ✅";
  if (goal.status === "failed") return "ไม่สำเร็จ 🥺";
  return "กำลังทำ 💗";
}

function typeText(goal){
  return goal.goal_type === "money" ? "การเงิน" : "ทั่วไป";
}

function render(){
  if (!goals.length){
    ui.grid.innerHTML = `
      <div class="card" style="cursor:default;">
        <div class="title">ยังไม่มี Goals เลย</div>
        <div class="note" style="margin-top:8px;">กดปุ่ม + มุมขวาบนเพื่อเพิ่มเป้าหมายแรกของเรา 💗</div>
      </div>
    `;
    return;
  }

  ui.grid.innerHTML = goals.map(g => {
    const due = g.due_date ? `กำหนด: ${g.due_date}` : "ไม่กำหนดวัน";
    const moneyMeta = (g.goal_type === "money" && g.target_amount != null)
      ? `<span>🎯 เป้า: ${fmt(g.target_amount)} บาท</span>`
      : "";

    return `
      <div class="card" data-id="${g.id}">
        <div class="row1">
          <div class="title">${g.title || "(ไม่มีชื่อ)"}</div>
          <div class="badge">${badgeText(g)}</div>
        </div>
        <div class="meta">
          <span>🧸 ประเภท: ${typeText(g)}</span>
          <span>📅 ${due}</span>
          ${moneyMeta}
        </div>
        ${g.note ? `<div class="note">📝 ${g.note}</div>` : ""}
      </div>
    `;
  }).join("");

  ui.grid.querySelectorAll(".card[data-id]").forEach(card => {
    card.addEventListener("click", () => openDetail(card.getAttribute("data-id")));
  });
}

async function requireLogin(){
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (!session){
    window.location.href = "index.html";
    return false;
  }
  return true;
}

async function loadGoals(){
  msg(ui.addMsg, "");
  msg(ui.detailMsg, "");

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error){
    msg(ui.addMsg, "โหลด Goals ไม่ได้: " + error.message, "err");
    goals = [];
    render();
    return;
  }

  goals = data || [];
  render();
}

function openAdd(){
  ui.gTitle.value = "";
  ui.gType.value = "general";
  ui.gDue.value = "";
  ui.gTarget.value = "";
  ui.gNoteShort.value = "";
  ui.gNote.value = "";
  moneyRowToggle();
  msg(ui.addMsg, "");
  ui.addModal.classList.add("show");
}

window.closeAdd = () => ui.addModal.classList.remove("show");
window.closeDetail = () => ui.detailModal.classList.remove("show");

async function addGoal(){
  const title = (ui.gTitle.value || "").trim();
  const goal_type = ui.gType.value;
  const due_date = ui.gDue.value || null;

  const note = (ui.gNote.value || "").trim() || (ui.gNoteShort.value || "").trim() || null;

  if (!title){
    msg(ui.addMsg, "กรอกชื่อเป้าหมายก่อนน้า 💗", "err");
    return;
  }

  let target_amount = null;
  if (goal_type === "money"){
    const t = ui.gTarget.value;
    if (t !== "" && t != null) target_amount = Number(t);
    // เป้าหมายการเงิน “ไม่บังคับจำนวนเงิน” ตามที่บอก
    // (ถ้าไม่กรอก target_amount ก็ยังสร้าง goal ได้)
  }

  ui.btnAddSave.disabled = true;
  ui.btnAddSave.textContent = "กำลังบันทึก...";

  const payload = {
    title,
    goal_type,
    due_date,
    target_amount,
    note,
    status: "in_progress",
    owner_id: session.user.id,
  };

  const { error } = await supabase.from("goals").insert(payload);

  ui.btnAddSave.disabled = false;
  ui.btnAddSave.textContent = "บันทึก";

  if (error){
    msg(ui.addMsg, "บันทึกไม่สำเร็จ: " + error.message, "err");
    return;
  }

  msg(ui.addMsg, "บันทึกแล้ว 💗", "ok");
  setTimeout(() => {
    closeAdd();
    loadGoals();
  }, 350);
}

function openDetail(id){
  selectedGoal = goals.find(g => String(g.id) === String(id));
  if (!selectedGoal) return;

  ui.dTitle.textContent = selectedGoal.title || "รายละเอียด Goal";
  ui.dNote.textContent = selectedGoal.note ? `📝 ${selectedGoal.note}` : "📝 ไม่มีโน้ต";

  const due = selectedGoal.due_date ? selectedGoal.due_date : "ไม่กำหนดวัน";
  const t = typeText(selectedGoal);

  const moneyMeta = (selectedGoal.goal_type === "money" && selectedGoal.target_amount != null)
    ? `<span>🎯 เป้า: ${fmt(selectedGoal.target_amount)} บาท</span>`
    : "";

  ui.dMeta.innerHTML = `
    <span>🧸 ประเภท: ${t}</span>
    <span>📅 กำหนด: ${due}</span>
    ${moneyMeta}
  `;

  selectedStatus = selectedGoal.status || "in_progress";
  syncStatusButtons();

  msg(ui.detailMsg, "");
  ui.detailModal.classList.add("show");
}

function syncStatusButtons(){
  ["in_progress","success","failed"].forEach(k => {
    const b = document.getElementById("st_"+k);
    if (!b) return;
    b.classList.toggle("active", selectedStatus === k);
  });
}

window.setStatus = (st) => {
  selectedStatus = st;
  syncStatusButtons();
};

async function saveStatus(){
  if (!selectedGoal) return;

  ui.btnDetailSave.disabled = true;
  ui.btnDetailSave.textContent = "กำลังบันทึก...";

  const { error } = await supabase
    .from("goals")
    .update({ status: selectedStatus })
    .eq("id", selectedGoal.id);

  ui.btnDetailSave.disabled = false;
  ui.btnDetailSave.textContent = "บันทึกสถานะ";

  if (error){
    msg(ui.detailMsg, "บันทึกสถานะไม่สำเร็จ: " + error.message, "err");
    return;
  }

  msg(ui.detailMsg, "บันทึกแล้ว 💗", "ok");
  setTimeout(() => {
    closeDetail();
    loadGoals();
  }, 300);
}

function wire(){
  ui.btnOpenAdd.addEventListener("click", openAdd);
  ui.gType.addEventListener("change", moneyRowToggle);
  ui.btnAddSave.addEventListener("click", addGoal);
  ui.btnDetailSave.addEventListener("click", saveStatus);

  // close on outside click
  ui.addModal.addEventListener("click", (e) => {
    if (e.target === ui.addModal) closeAdd();
  });
  ui.detailModal.addEventListener("click", (e) => {
    if (e.target === ui.detailModal) closeDetail();
  });
}

(async function init(){
  const ok = await requireLogin();
  if (!ok) return;
  wire();
  moneyRowToggle();
  await loadGoals();
})();
