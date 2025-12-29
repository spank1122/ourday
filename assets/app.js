// assets/app.js

// Shared UX: navbar + smooth fade transition + active link
const PAGES = [
  { href: "main.html",   label: "Home" },
  { href: "photos.html", label: "Photos" },
  { href: "goals.html",  label: "Goals" },     // ✅ เพิ่ม
  { href: "savings.html",label: "Savings" },   // ✅ เพิ่ม
  { href: "letter.html", label: "Letter" },
  { href: "gift.html",   label: "Gift" },
];

function ensureFadeLayer() {
  if (!document.getElementById("pageFade")) {
    const d = document.createElement("div");
    d.id = "pageFade";
    document.body.appendChild(d);
  }
}

function currentFile() {
  const p = location.pathname.split("/").pop() || "index.html";
  return p.toLowerCase();
}

function mountNavbar() {
  const host = document.getElementById("appNav");
  if (!host) return;

  const file = currentFile();
  const links = PAGES.map((p) => {
    const active = p.href.toLowerCase() === file ? "active" : "";
    return `<a class="${active}" href="${p.href}">${p.label}</a>`;
  }).join("");

  host.innerHTML = `
    <div class="navbar glass">
      <div class="nav-left">
        <span class="brand-dot"></span>
        <span class="brand">Our Day</span>
      </div>
      <nav class="nav-links">${links}</nav>
    </div>
    <div class="nav-spacer"></div>
  `;
}

function wirePageTransitions() {
  // Fade-in on load
  requestAnimationFrame(() => {
    document.body.classList.remove("is-leaving");
  });

  // Intercept internal navigations
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href") || "";
    const isSameHost =
      !href.startsWith("http") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("#");

    if (!isSameHost) return;

    // allow new tab
    if (a.target === "_blank" || e.metaKey || e.ctrlKey) return;

    e.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 220);
  });
}

function bootstrap() {
  ensureFadeLayer();

  // Skip navbar on gate page
  const isGate = document.body.getAttribute("data-page") === "gate";
  if (!isGate) mountNavbar();

  wirePageTransitions();
}

document.addEventListener("DOMContentLoaded", bootstrap);
