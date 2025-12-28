// 6-digit gate UX (like the reference)
function setupGate(){
  const wrap = document.getElementById("gatePad");
  if (!wrap) return;

  const code = (window.__GATE__?.gateCode || "131024").toString();
  const userId = window.__GATE__?.sessionUserId || "anon";
  const passedKey = window.__GATE__?.passedKey || `gate_passed_${userId}`;

  const boxes = Array.from(document.querySelectorAll(".code-box"));
  const msg = document.getElementById("gateMsg");

  const setMsg = (t, ok=false) => {
    msg.textContent = t || "";
    msg.classList.toggle("ok", ok);
    msg.classList.toggle("bad", !ok && !!t);
  };

  const getValue = () => boxes.map(b => b.value).join("");
  const clearAll = () => { boxes.forEach(b => b.value=""); boxes[0]?.focus(); };

  const check = () => {
    const v = getValue();
    if (v.length < 6) return;
    if (v === code){
      setMsg("ถูกต้องแล้ววว 💖", true);
      sessionStorage.setItem(passedKey, "true");
      setTimeout(() => (window.location.href = "main.html"), 300);
    }else{
      setMsg("รหัสไม่ถูกน้าา 💔");
      const card = document.querySelector(".gate-card");
      card?.classList.remove("shake");
      void card?.offsetWidth;
      card?.classList.add("shake");
      setTimeout(clearAll, 650);
    }
  };

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = (box.value || "").replace(/\D/g, "").slice(0,1);
      if (box.value && i < boxes.length-1) boxes[i+1].focus();
      check();
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i>0){
        boxes[i-1].focus();
        boxes[i-1].value = "";
      }
      if (e.key === "Enter") check();
      if (e.key === "ArrowLeft" && i>0) boxes[i-1].focus();
      if (e.key === "ArrowRight" && i<boxes.length-1) boxes[i+1].focus();
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const txt = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0,6);
      txt.split("").forEach((ch, idx) => { if (boxes[idx]) boxes[idx].value = ch; });
      boxes[Math.min(txt.length, 6)-1]?.focus();
      check();
    });
  });

  document.getElementById("gateClear")?.addEventListener("click", () => {
    setMsg("");
    clearAll();
  });

  // auto focus
  boxes[0]?.focus();
}
window.addEventListener("DOMContentLoaded", setupGate);
