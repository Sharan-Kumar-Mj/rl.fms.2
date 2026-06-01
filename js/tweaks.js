/* ============================================================
   FMS — Tweaks panel (vanilla) + host edit-mode protocol
   ============================================================ */
(function () {
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "orange",
    "tints": true,
    "density": "comfortable",
    "role": "requester",
    "brand": "FMTrack"
  }/*EDITMODE-END*/;

  const ACCENTS = {
    orange: { primary:"#EA5B2B", hi:"#C9501C", dim:"rgba(234,91,43,0.13)", line:"rgba(234,91,43,0.45)", grad:"linear-gradient(150deg,#FF7A45,#EA5B2B)", sw:"#EA5B2B" },
    indigo: { primary:"#5458DA", hi:"#4044C0", dim:"rgba(84,88,218,0.13)",  line:"rgba(84,88,218,0.45)", grad:"linear-gradient(150deg,#7A7EF0,#5458DA)", sw:"#5458DA" },
    green:  { primary:"#15A06A", hi:"#0E7E53", dim:"rgba(21,160,106,0.13)", line:"rgba(21,160,106,0.45)", grad:"linear-gradient(150deg,#2FBF87,#15A06A)", sw:"#15A06A" },
    blue:   { primary:"#2A7FE0", hi:"#1F66C0", dim:"rgba(42,127,224,0.13)", line:"rgba(42,127,224,0.45)", grad:"linear-gradient(150deg,#4F9BF5,#2A7FE0)", sw:"#2A7FE0" },
  };

  const KEY = "fms_tweaks_v1";
  let state = Object.assign({}, DEFAULTS, readLS());

  function readLS() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveLS() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function applyVisuals() {
    const root = document.documentElement.style;
    const a = ACCENTS[state.accent] || ACCENTS.orange;
    root.setProperty("--primary", a.primary);
    root.setProperty("--primary-hi", a.hi);
    root.setProperty("--primary-dim", a.dim);
    root.setProperty("--primary-line", a.line);
    root.setProperty("--btn-grad", a.grad);
    document.body.classList.toggle("tints-off", !state.tints);
    document.body.classList.toggle("density-compact", state.density === "compact");
  }

  function applyRole() {
    if (window.App && window.App.state && window.App.state.role !== state.role) {
      window.App.state.role = state.role;
      window.App.go(window.App.state.view || "dashboard");
    }
  }

  function setTweak(key, val) {
    state[key] = val;
    saveLS();
    applyVisuals();
    if (key === "role") applyRole();
    if (key === "brand" && window.App) window.App.refresh();
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [key]: val } }, "*");
    syncControls();
  }

  // ---- panel ----
  let panel = null;
  function buildPanel() {
    panel = document.createElement("div");
    panel.className = "tw-panel";
    panel.innerHTML = `
      <div class="tw-head" id="tw-head">
        <span class="dot3"></span><h4>Tweaks</h4>
        <button class="icon-btn x" id="tw-close" aria-label="Close" style="width:30px;height:30px">${window.icon("x",16)}</button>
      </div>
      <div class="tw-body">
        <div class="tw-sec">Brand</div>
        <div class="tw-row"><label>Accent color</label>
          <div class="tw-swatches" id="tw-accent">
            ${Object.keys(ACCENTS).map(k=>`<button class="tw-sw" data-accent="${k}" style="background:${ACCENTS[k].sw}" title="${k}"></button>`).join("")}
          </div>
        </div>
        <div class="tw-row"><label>App name</label>
          <input class="tw-input" id="tw-brand" value="${(state.brand||"").replace(/"/g,'&quot;')}" maxlength="18">
        </div>

        <div class="tw-sec">Layout</div>
        <div class="tw-row"><label>Density</label>
          <div class="tw-seg" id="tw-density">
            <button data-density="comfortable">Comfortable</button>
            <button data-density="compact">Compact</button>
          </div>
        </div>
        <div class="tw-row"><label>Status card tint</label>
          <div class="tw-switch" id="tw-tints" role="switch"></div>
        </div>

        <div class="tw-sec">Demo</div>
        <div class="tw-row"><label>Landing role</label>
          <select class="tw-select" id="tw-role">
            ${(window.DB?window.DB.ROLES:[]).map(r=>`<option value="${r.id}">${r.name.split(" ")[0]} · ${r.title.split("·")[0].trim()}</option>`).join("")}
          </select>
        </div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelector("#tw-close").onclick = dismiss;
    panel.querySelector("#tw-accent").addEventListener("click", e => { const b = e.target.closest("[data-accent]"); if (b) setTweak("accent", b.dataset.accent); });
    panel.querySelector("#tw-density").addEventListener("click", e => { const b = e.target.closest("[data-density]"); if (b) setTweak("density", b.dataset.density); });
    panel.querySelector("#tw-tints").onclick = () => setTweak("tints", !state.tints);
    panel.querySelector("#tw-role").onchange = e => setTweak("role", e.target.value);
    panel.querySelector("#tw-brand").oninput = e => setTweak("brand", e.target.value || "FMTrack");

    makeDraggable(panel, panel.querySelector("#tw-head"));
    syncControls();
  }

  function syncControls() {
    if (!panel) return;
    panel.querySelectorAll("[data-accent]").forEach(b => b.classList.toggle("active", b.dataset.accent === state.accent));
    panel.querySelectorAll("[data-density]").forEach(b => b.classList.toggle("active", b.dataset.density === state.density));
    panel.querySelector("#tw-tints").classList.toggle("on", !!state.tints);
    const rs = panel.querySelector("#tw-role"); if (rs) rs.value = state.role;
  }

  function makeDraggable(el, handle) {
    let sx, sy, ox, oy, drag = false;
    handle.addEventListener("mousedown", e => {
      if (e.target.closest("#tw-close")) return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      el.style.right = "auto"; el.style.bottom = "auto"; el.style.left = ox + "px"; el.style.top = oy + "px";
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", e => {
      if (!drag) return;
      el.style.left = Math.max(8, ox + e.clientX - sx) + "px";
      el.style.top = Math.max(8, oy + e.clientY - sy) + "px";
    });
    window.addEventListener("mouseup", () => { drag = false; document.body.style.userSelect = ""; });
  }

  function show() { if (!panel) buildPanel(); panel.classList.add("open"); }
  function hide() { if (panel) panel.classList.remove("open"); }
  function dismiss() { hide(); window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); }

  // ---- host protocol ----
  window.addEventListener("message", e => {
    const t = e && e.data && e.data.type;
    if (t === "__activate_edit_mode") show();
    else if (t === "__deactivate_edit_mode") hide();
  });

  function init() {
    applyVisuals();
    applyRole();
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
  }

  window.Tweaks = { get: k => state[k], set: setTweak };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
