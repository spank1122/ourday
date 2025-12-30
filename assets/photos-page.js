import { supabase } from "./supabase.js";
import { requireAuth } from "./auth-guard.js";

const ui = {
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  q: document.getElementById("q"),
  btnReload: document.getElementById("btnReload"),
  btnAdd: document.getElementById("btnAddPhoto"),
  modal: document.getElementById("photoModal"),
  closeModal: document.getElementById("closeModal"),
  cancel: document.getElementById("cancelPhoto"),
  save: document.getElementById("savePhoto"),
  file: document.getElementById("file"),
  title: document.getElementById("title"),
  desc: document.getElementById("desc"),
  msg: document.getElementById("photoMsg"),

  lightbox: document.getElementById("lightbox"),
  closeLight: document.getElementById("closeLight"),
  lightImg: document.getElementById("lightImg"),
  lightTitle: document.getElementById("lightTitle"),
  lightDesc: document.getElementById("lightDesc"),
};

function setMsg(t){ ui.msg.textContent = t || ""; }

function openModal(){ ui.modal.classList.add("show"); setMsg(""); }
function closeModal(){
  ui.modal.classList.remove("show");
  ui.file.value = "";
  ui.title.value = "";
  ui.desc.value = "";
  setMsg("");
}

function openLight(url, title, desc){
  ui.lightImg.src = url;
  ui.lightTitle.textContent = title || "";
  ui.lightDesc.textContent = desc || "";
  ui.lightbox.classList.add("show");
}
function closeLight(){
  ui.lightbox.classList.remove("show");
  ui.lightImg.src = "";
}

async function listPhotos(){
  const session = await requireAuth();
  if (!session) return;

  const q = (ui.q.value || "").trim().toLowerCase();

  // read all shared album
  let query = supabase
    .from("photos_metadata")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error){
    ui.grid.innerHTML = "";
    ui.empty.style.display = "block";
    ui.empty.textContent = "โหลดรูปไม่สำเร็จ: " + error.message;
    return;
  }

  const rows = (data || []).filter(r => {
    if (!q) return true;
    return (r.title || "").toLowerCase().includes(q);
  });

  if (!rows.length){
    ui.grid.innerHTML = "";
    ui.empty.style.display = "block";
    return;
  }

  ui.empty.style.display = "none";

  // build cards
  const cards = [];
  for (const r of rows){
    const { data: signed, error: signErr } = await supabase
      .storage
      .from("photos")
      .createSignedUrl(r.file_path, 60 * 60); // 1 hour

    const url = signed?.signedUrl || "";
    const safeTitle = (r.title || "").replace(/</g,"&lt;");
    const safeDesc = (r.description || "").replace(/</g,"&lt;");

    cards.push(`
      <div class="glass" style="border-radius:18px; overflow:hidden; border:1px solid rgba(255,94,154,.12);">
        <div style="aspect-ratio: 1/1; background:rgba(255,94,154,.06);">
          ${url ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;"
                data-url="${url}" data-title="${safeTitle}" data-desc="${safeDesc}">`
              : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:rgba(255,94,154,.6); font-weight:800;">
                  ${signErr ? "โหลดรูปไม่ได้" : "กำลังโหลด"}
                 </div>`}
        </div>
        <div style="padding:10px 12px;">
          <div style="font-weight:900; color:rgba(255,94,154,.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${safeTitle}
          </div>
          <div style="color:rgba(26,37,47,.55); font-weight:700; font-size:12px; margin-top:2px;">
            ${(r.created_at || "").slice(0,10)}
          </div>
        </div>
      </div>
    `);
  }

  ui.grid.innerHTML = cards.join("");

  // wire click for lightbox
  ui.grid.querySelectorAll("img[data-url]").forEach(img => {
    img.addEventListener("click", () => openLight(img.dataset.url, img.dataset.title, img.dataset.desc));
  });
}

async function uploadPhoto(){
  const session = await requireAuth();
  if (!session) return;

  const f = ui.file.files?.[0];
  const title = (ui.title.value || "").trim();
  const desc = (ui.desc.value || "").trim();

  if (!f) return setMsg("กรุณาเลือกรูปก่อนนะ");
  if (!title) return setMsg("กรุณากรอกชื่อรูปก่อนนะ");

  ui.save.disabled = true;
  ui.save.textContent = "กำลังบันทึก...";

  try{
    // 1) upload storage
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `shared/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: upErr } = await supabase
      .storage
      .from("photos")
      .upload(path, f, { upsert: false, contentType: f.type });

    if (upErr) throw upErr;

    // 2) insert metadata
    const { error: insErr } = await supabase
      .from("photos_metadata")
      .insert([{
        user_id: session.user.id,
        file_path: path,
        title,
        description: desc || null,
        taken_at: null,
      }]);

    if (insErr) throw insErr;

    setMsg("บันทึกแล้ว 💗");
    closeModal();
    await listPhotos();
  }catch(err){
    setMsg("บันทึกไม่สำเร็จ: " + (err?.message || String(err)));
  }finally{
    ui.save.disabled = false;
    ui.save.textContent = "บันทึก";
  }
}

ui.btnAdd.addEventListener("click", openModal);
ui.closeModal.addEventListener("click", closeModal);
ui.cancel.addEventListener("click", closeModal);
ui.btnReload.addEventListener("click", listPhotos);
ui.q.addEventListener("keyup", () => listPhotos());
ui.save.addEventListener("click", uploadPhoto);

ui.closeLight.addEventListener("click", closeLight);
ui.lightbox.addEventListener("click", (e) => { if (e.target === ui.lightbox) closeLight(); });
ui.modal.addEventListener("click", (e) => { if (e.target === ui.modal) closeModal(); });

document.addEventListener("DOMContentLoaded", listPhotos);
