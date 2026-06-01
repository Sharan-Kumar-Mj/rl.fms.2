/* ============================================================
   FMS — Shared UI helpers: escape, dates, badges,
   toasts, modal, chart renderers
   ============================================================ */
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  function daysBetween(a, b) {
    const d1 = new Date(a), d2 = new Date(b);
    return Math.round((d2 - d1) / 86400000);
  }
  const TODAY = new Date("2026-05-29T00:00:00");
  function daysFromToday(d) { return daysBetween(TODAY, new Date(d + "T00:00:00")); }

  // ---- status meta ----
  const PR_STAGE_TONE = {
    "Submitted": "idle", "Review": "info", "Assigned": "secondary",
    "Work In-Progress": "primary", "Completion Review": "warn", "Closed": "ok",
  };
  const ASSET_TONE = { operational: "ok", breakdown: "danger", inactive: "idle" };
  const PPM_TONE = { overdue: "danger", "due-soon": "warn", upcoming: "info", done: "ok" };
  const CAT_TONE = { Electrical:"warn", Plumbing:"info", Painting:"secondary", HVAC:"ok", Mechanical:"primary", Safety:"danger", Generator:"primary", "Fire Safety":"danger" };

  function badge(text, tone, pip) {
    return `<span class="badge b-${tone}">${pip ? '<span class="pip"></span>' : ''}${esc(text)}</span>`;
  }
  function stageBadge(stage) { return badge(stage, PR_STAGE_TONE[stage] || "idle", true); }
  function assetBadge(st) {
    const map = { operational: "Operational", breakdown: "Breakdown", inactive: "Inactive" };
    return badge(map[st] || st, ASSET_TONE[st] || "idle", true);
  }
  function prio(p) {
    const lbl = { high: "High", medium: "Medium", low: "Low" }[p] || p;
    return `<span class="prio ${p}"><span class="bars"><i></i><i></i><i></i></span>${lbl}</span>`;
  }
  function catBadge(c) { return badge(c, CAT_TONE[c] || "idle", false); }

  function avatar(name, color, size) {
    const init = name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
    const s = size || 24;
    const c = color || "#6E72F4";
    return `<span class="avatar-xs" style="background:linear-gradient(145deg,${c},${shade(c,-18)});width:${s}px;height:${s}px;font-size:${s*0.4}px">${esc(init)}</span>`;
  }
  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + Math.round(2.55 * pct), g = ((n >> 8) & 255) + Math.round(2.55 * pct), b = (n & 255) + Math.round(2.55 * pct);
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---- Toasts ----
  function toast({ title, body, tone = "primary", icon = "bell" }) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) { stack = document.createElement("div"); stack.className = "toast-stack"; document.body.appendChild(stack); }
    const el = document.createElement("div");
    el.className = "toast";
    el.style.position = "relative";
    el.innerHTML = `<span class="ti t-${tone}">${window.icon(icon, 16)}</span>
      <div style="flex:1"><b>${esc(title)}</b>${body ? `<p>${esc(body)}</p>` : ""}</div>
      <button class="x">${window.icon("x", 14)}</button>`;
    stack.appendChild(el);
    const showIt = () => el.classList.add("show");
    requestAnimationFrame(showIt);
    setTimeout(showIt, 30);
    const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); };
    el.querySelector(".x").onclick = close;
    setTimeout(close, 4800);
  }

  // ---- Modal ----
  let modalEl = null;
  function modal({ title, sub, body, foot, wide }) {
    closeModal();
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
        <button class="icon-btn x" aria-label="Close">${window.icon("x", 18)}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
    </div>`;
    document.body.appendChild(scrim);
    modalEl = scrim;
    void scrim.offsetWidth;
    const openIt = () => scrim.classList.add("open");
    requestAnimationFrame(openIt);
    setTimeout(openIt, 30); // fallback if rAF is throttled (background tab)
    scrim.querySelector(".x").onclick = closeModal;
    scrim.addEventListener("mousedown", e => { if (e.target === scrim) closeModal(); });
    document.addEventListener("keydown", escClose);
    return scrim;
  }
  function escClose(e) { if (e.key === "Escape") closeModal(); }
  function closeModal() {
    if (!modalEl) return;
    const m = modalEl; modalEl = null;
    m.classList.remove("open");
    document.removeEventListener("keydown", escClose);
    setTimeout(() => m.remove(), 220);
  }

  // ============================================================
  //  CHART RENDERERS
  // ============================================================
  const TONE_HEX = {
    ok:"#15A06A", warn:"#D18A0E", danger:"#DC4750", info:"#2A7FE0",
    primary:"#EA5B2B", secondary:"#5458DA", idle:"#8B92A0",
  };
  function toneHex(t) { return TONE_HEX[t] || t; }

  // Donut: data = [{label, value, tone}]
  function donut(data, centerVal, centerCap) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const R = 70, C = 2 * Math.PI * R;
    let offset = 0;
    const segs = data.map(d => {
      const frac = d.value / total;
      const len = frac * C;
      const dash = `${len} ${C - len}`;
      const s = `<circle class="seg" r="${R}" cx="84" cy="84" stroke="${toneHex(d.tone)}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" style="--len:${len}"></circle>`;
      offset += len;
      return s;
    }).join("");
    const legend = data.map(d => `
      <div class="li">
        <span class="sw" style="background:${toneHex(d.tone)}"></span>
        <span class="nm">${esc(d.label)}</span>
        <span class="vl">${d.value}</span>
        <span class="pct">${Math.round(d.value / total * 100)}%</span>
      </div>`).join("");
    return `<div class="donut-wrap">
      <div class="donut">
        <svg viewBox="0 0 168 168"><circle class="track" r="${R}" cx="84" cy="84"></circle>${segs}</svg>
        <div class="center"><div class="big tnum">${centerVal}</div><div class="cap">${esc(centerCap)}</div></div>
      </div>
      <div class="legend">${legend}</div>
    </div>`;
  }

  // Stacked vertical bars: cols=[{cap, segs:[{value,tone}]}], scaleMax optional
  // Uses pixel heights against a fixed track so bars render reliably across
  // all browsers (percentage heights inside flex columns are unreliable).
  function barsStacked(cols, scaleMax, track) {
    const TRACK = track || 150;
    const max = scaleMax || Math.max(...cols.map(c => c.segs.reduce((s, x) => s + x.value, 0))) || 1;
    return `<div class="barchart">${cols.map(c => {
      const tot = c.segs.reduce((s, x) => s + x.value, 0);
      const stackPx = Math.round((tot / max) * TRACK);
      const segHtml = c.segs.map(s => {
        const segPx = tot ? Math.round((s.value / tot) * stackPx) : 0;
        return `<div class="seg" style="height:${segPx}px;background:${toneHex(s.tone)}"></div>`;
      }).join("");
      return `<div class="col">
        <div class="val">${tot}</div>
        <div class="stack" style="height:${stackPx}px">${segHtml}</div>
        <div class="cap">${esc(c.cap)}</div>
      </div>`;
    }).join("")}</div>`;
  }

  // Horizontal bars: data=[{label, value, tone, max}]
  function hbars(data, scaleMax) {
    const max = scaleMax || Math.max(...data.map(d => d.value)) || 1;
    return `<div class="hbars">${data.map(d => `
      <div class="hbar">
        <div class="top"><span class="nm">${esc(d.label)}</span><span class="vl tnum">${d.suffix ? d.value + d.suffix : d.value}</span></div>
        <div class="track"><div class="fill" style="width:${(d.value / max) * 100}%;background:${toneHex(d.tone)}"></div></div>
      </div>`).join("")}</div>`;
  }

  // Sparkline area: values=[...], tone
  function spark(values, tone, w = 280, h = 56) {
    const max = Math.max(...values), min = Math.min(...values);
    const rng = (max - min) || 1;
    const step = w / (values.length - 1);
    const pts = values.map((v, i) => [i * step, h - ((v - min) / rng) * (h - 8) - 4]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${w} ${h} L0 ${h} Z`;
    const c = toneHex(tone);
    const gid = "g" + Math.random().toString(36).slice(2, 7);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.32"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </linearGradient></defs>
      <path class="area" d="${area}" fill="url(#${gid})"/>
      <path class="line" d="${line}" stroke="${c}"/>
    </svg>`;
  }

  // mini ring gauge
  function gauge(pct, tone) {
    const R = 16, C = 2 * Math.PI * R;
    const off = C * (1 - pct / 100);
    return `<div class="minigauge"><div class="ring"><svg width="38" height="38" viewBox="0 0 38 38">
      <circle class="tk" r="${R}" cx="19" cy="19"></circle>
      <circle class="pg" r="${R}" cx="19" cy="19" stroke="${toneHex(tone)}" stroke-dasharray="${C}" stroke-dashoffset="${off}"></circle>
    </svg><div class="txt">${pct}</div></div></div>`;
  }

  // Charts now render their final values inline (reliable across browsers),
  // so this is a no-op kept for backward compatibility with view mounts.
  function animateCharts(root) { /* intentionally empty */ }

  // Reveal .view-anim elements (transition in). Idempotent + background-safe.
  function reveal(root) {
    const els = [root, ...root.querySelectorAll(".view-anim")].filter(e => e.classList && e.classList.contains("view-anim"));
    els.forEach(el => { if (el.style.animationDelay) el.style.transitionDelay = el.style.animationDelay; });
    void root.offsetWidth;
    const go = () => els.forEach(el => el.classList.add("in"));
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 60);
  }

  window.UI = {
    esc, fmtDate, daysBetween, daysFromToday, TODAY,
    badge, stageBadge, assetBadge, prio, catBadge, avatar, shade,
    toast, modal, closeModal,
    donut, barsStacked, hbars, spark, gauge, animateCharts, reveal, toneHex,
    PR_STAGE_TONE, ASSET_TONE, PPM_TONE, CAT_TONE,
  };
})();
