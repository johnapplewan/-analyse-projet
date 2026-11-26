const CFG = window.SITE_CONFIG || {};
const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Les 7 conseillers du board par défaut (portraits déjà dans /room/portraits)
const SEATS = [
  ["bezos", "#e8a33d"], ["graham", "#f26b3a"], ["hormozi", "#37bdf8"], ["garyvee", "#a78bfa"],
  ["martell", "#3fcf8e"], ["wickman", "#f472b6"], ["buffett", "#ffd166"],
];
const img = (k) => `room/portraits/${k}-base.webp`;
const demoHref = CFG.demo ? `room/?demo=${encodeURIComponent(CFG.demo)}` : "room/";

// visages sous le formulaire + sièges autour de la table
$("#faces").innerHTML = SEATS.map(([k]) => `<li><img src="${img(k)}" alt="" loading="lazy"></li>`).join("");
const stage = $("#stage");
SEATS.forEach(([k, c], i) => {
  const a = (Math.PI * 2 * i) / SEATS.length - Math.PI / 2;
  const el = document.createElement("div");
  el.className = "seat";
  el.style.cssText = `left:${50 + Math.cos(a) * 44}%;top:${50 + Math.sin(a) * 42}%;--c:${c};--i:${i}`;
  el.innerHTML = `<img src="${img(k)}" alt="">`;
  stage.appendChild(el);
});
$("#demoBtn").href = demoHref;
$("#demo2").href = demoHref;

let project = "";

$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  project = $("#project").value.trim();
  if (!project) return;
  $("#hero").classList.add("leaving");
  const room = $("#room");
  room.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => room.classList.add("open"));
  const showGate = () => { $("#gate").hidden = false; $("#code").focus(); };
  if (REDUCED) showGate(); else setTimeout(showGate, 2400);
});

$("#back").addEventListener("click", () => {
  $("#gate").hidden = true;
  $("#room").classList.remove("open");
  $("#room").setAttribute("aria-hidden", "true");
  $("#hero").classList.remove("leaving");
  $("#project").focus();
});

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

$("#codeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#err");
  err.hidden = true;
  if (!CFG.hash) { err.textContent = "L'accès n'est pas encore configuré sur ce site."; err.hidden = false; return; }
  const ok = (await sha256(`${CFG.salt}:${$("#code").value}`)) === CFG.hash;
  if (!ok) { err.textContent = "Code incorrect."; err.hidden = false; $("#code").select(); return; }
  $("#gate").hidden = true;
  showReady();
});

function showReady() {
  const oneLine = !project.includes("\n") && project.length < 200;
  const arg = oneLine && /^(https?:\/\/\S+|[\w.-]+\/[\w.-]+|github\.com\/\S+)$/.test(project) ? project : JSON.stringify(project.replace(/\s+/g, " ").slice(0, 600));
  const cmd = `/analyse-projet ${arg}`;
  $("#summary").textContent = project.length > 600 ? project.slice(0, 600) + "…" : project;
  $("#cmd").textContent = cmd;
  const body = `Projet à analyser :\n\n${project.slice(0, 1500)}\n\nCommande : ${cmd}`;
  $("#issue").href = `https://github.com/${CFG.repo}/issues/new?title=${encodeURIComponent("Analyse de projet")}&body=${encodeURIComponent(body)}`;
  $("#copy").onclick = async () => {
    try { await navigator.clipboard.writeText(cmd); $("#copy").textContent = "Copié ✓"; } catch { $("#copy").textContent = "Sélectionne et copie à la main"; }
  };
  $("#ready").hidden = false;
}
