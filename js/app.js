/* ============================================================
   FMS — App controller: shell, routing, roles, notifications
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"dashboard" },
    { id:"requests",  label:"Service Requests", icon:"ticket" },
    { id:"assets",    label:"Asset Tracker (MHE)", icon:"forklift" },
    { id:"ppm",       label:"PPM Scheduler", icon:"calendar" },
    { id:"inventory", label:"Inventory", icon:"boxes" },
    { id:"logbook",   label:"Digital Log Books", icon:"book" },
  ];

  const PAGE_META = {
    dashboard: { crumb:"Overview" },
    requests:  { crumb:"FM workflow" },
    assets:    { crumb:"Material handling" },
    ppm:       { crumb:"Preventive maintenance" },
    inventory: { crumb:"MEP spares" },
    logbook:   { crumb:"Daily logs" },
  };

  const state = {
    view: "dashboard",
    role: "requester",
    get roleObj() { return DB.ROLES.find(r => r.id === this.role); },
    notis: DB.NOTIS.slice(),
  };

  // ---------- shell render ----------
  function navCounts() {
    return {
      requests: DB.PR.filter(p => p.stage !== "Closed").length,
      inventory: DB.INVENTORY.filter(i => i.qty < i.min).length,
      ppm: DB.PPM.filter(p => p.status === "overdue" || p.status === "due-soon").length,
      assets: DB.MHE.filter(m => m.status === "breakdown").length,
    };
  }

  function renderShell() {
    const counts = navCounts();
    const r = state.roleObj;
    const unread = state.notis.filter(n => n.unread).length;
    document.getElementById("app").innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">${I("layers",20)}</div>
          <div><div class="brand-name">${brandHtml()}</div><div class="brand-sub">RetailLogis</div></div>
        </div>
        <nav class="nav">
          <div class="nav-label">Operations</div>
          ${NAV.map(n => `<button class="nav-item ${state.view===n.id?"active":""}" data-nav="${n.id}">
            ${I(n.icon,18)}<span>${n.label}</span>
            ${counts[n.id] ? `<span class="count">${counts[n.id]}</span>` : ""}
          </button>`).join("")}
        </nav>
        <div class="sidebar-foot">
          <div class="nav-item" style="cursor:default">${I("info",18)}<div style="line-height:1.3"><div class="fs-13 fw-6">Compliance: 94%</div><div class="dim" style="font-size:11px">SLA on track</div></div></div>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="icon-btn hamburger" id="hamburger">${I("menu",20)}</button>
          <div>
            <div class="page-title" id="page-title"></div>
            <div class="page-crumb" id="page-crumb"></div>
          </div>
          <div class="topbar-spacer"></div>
          <div class="search-box">${I("search",15)}<input placeholder="Search requests, assets…"></div>
          <button class="icon-btn" id="bell-btn">${I("bell",19)}${unread?`<span class="dot"></span>`:""}</button>
          <button class="role-switch" id="role-btn">
            <span class="avatar" style="background:linear-gradient(145deg,${r.color},${U.shade(r.color,-20)})">${r.initials}</span>
            <span class="who"><b>${r.name}</b><small>${r.title}</small></span>
            ${I("chevDown",15)}
          </button>
        </header>
        <main class="content" id="content"><div class="content-inner" id="content-inner"></div></main>
      </div>

      <div class="scrim" id="scrim"></div>
    `;

    // popovers (appended to topbar)
    const topbar = document.querySelector(".topbar");
    topbar.insertAdjacentHTML("beforeend", notiPopover() + roleMenu());

    wireShell();
    renderView();
  }

  function notiPopover() {
    const items = state.notis.map(n => `<div class="noti ${n.unread?"unread":""}" data-noti="${n.id}">
      <div class="ni t-${n.tone}">${I(n.icon,16)}</div>
      <div class="nb"><b>${U.esc(n.title)}</b><p>${U.esc(n.body)}</p><time>${n.time}</time></div>
    </div>`).join("");
    return `<div class="popover" id="noti-pop">
      <div class="popover-head"><h4>Notifications</h4><a id="mark-read">Mark all read</a></div>
      <div class="noti-list">${items || '<div class="empty">No notifications</div>'}</div>
    </div>`;
  }

  function roleMenu() {
    return `<div class="role-menu" id="role-menu">
      <div class="rm-head">Switch role · demo</div>
      ${DB.ROLES.map(r => `<button class="role-opt ${state.role===r.id?"active":""}" data-role="${r.id}">
        <span class="avatar" style="background:linear-gradient(145deg,${r.color},${U.shade(r.color,-20)})">${r.initials}</span>
        <span style="flex:1"><b>${r.name}</b><small>${r.title}</small></span>
        <span class="check">${I("check",16)}</span>
      </button>`).join("")}
    </div>`;
  }

  function wireShell() {
    document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { go(b.dataset.nav); closeMobileNav(); });
    document.getElementById("hamburger").onclick = () => document.body.classList.toggle("nav-open");
    document.getElementById("scrim").onclick = closeMobileNav;

    const bellBtn = document.getElementById("bell-btn");
    const notiPop = document.getElementById("noti-pop");
    const roleBtn = document.getElementById("role-btn");
    const roleMenuEl = document.getElementById("role-menu");

    bellBtn.onclick = (e) => { e.stopPropagation(); roleMenuEl.classList.remove("open"); notiPop.classList.toggle("open"); };
    roleBtn.onclick = (e) => { e.stopPropagation(); notiPop.classList.remove("open"); roleMenuEl.classList.toggle("open"); };
    document.addEventListener("click", () => { notiPop.classList.remove("open"); roleMenuEl.classList.remove("open"); });
    notiPop.onclick = (e) => e.stopPropagation();
    roleMenuEl.onclick = (e) => e.stopPropagation();

    document.getElementById("mark-read").onclick = () => {
      state.notis.forEach(n => n.unread = false);
      refreshShellChrome();
    };
    notiPop.querySelectorAll("[data-noti]").forEach(el => el.onclick = () => {
      const n = state.notis.find(x => x.id == el.dataset.noti); if (n) n.unread = false;
      refreshShellChrome();
    });

    roleMenuEl.querySelectorAll("[data-role]").forEach(b => b.onclick = () => {
      state.role = b.dataset.role;
      roleMenuEl.classList.remove("open");
      renderShell();
      U.toast({ title:`Viewing as ${state.roleObj.name}`, body:state.roleObj.title, tone:"secondary", icon:"user" });
    });
  }

  function refreshShellChrome() {
    // re-render topbar bell + popover + role menu + nav counts without full view rebuild
    renderShell();
  }

  function closeMobileNav() { document.body.classList.remove("nav-open"); }

  function brandHtml() {
    const b = (window.Tweaks && window.Tweaks.get("brand")) || "FMTrack";
    if (b === "FMTrack") return 'FM<span>Track</span>';
    return UI.esc(b);
  }

  // ---------- view routing ----------
  function renderView() {
    const meta = PAGE_META[state.view] || {};
    const navItem = NAV.find(n => n.id === state.view);
    document.getElementById("page-title").textContent = navItem ? navItem.label : "Dashboard";
    document.getElementById("page-crumb").textContent = (state.view === "dashboard" ? state.roleObj.title + " · " : "") + (meta.crumb || "");

    const inner = document.getElementById("content-inner");
    const V = window.Views[state.view];
    inner.innerHTML = V.render(state);
    if (V.mount) V.mount(inner, state);
    wireViewDelegation(inner);
    inner.classList.add("view-anim");
    U.reveal(inner);
    document.getElementById("content").scrollTop = 0;
  }

  // delegated clicks shared across views
  function wireViewDelegation(root) {
    root.querySelectorAll("[data-act='new-request']").forEach(b => b.onclick = () => window.Views.requests.openForm());
    root.querySelectorAll("[data-act='transfer']").forEach(b => b.onclick = () => window.Views.assets.openTransfer());
    root.querySelectorAll("[data-act='ppm-calc']").forEach(b => b.onclick = () => window.Views.ppm.openCalc());
    root.querySelectorAll("[data-act='ppm-new']").forEach(b => b.onclick = () => window.Views.ppm.openNew());
    root.querySelectorAll("[data-act='inv-new']").forEach(b => b.onclick = () => window.Views.inventory.openNew());
    root.querySelectorAll("[data-act='solar-log']").forEach(b => b.onclick = () => window.Views.logbook.openSolarLog());
    root.querySelectorAll("[data-act='health-log']").forEach(b => b.onclick = () => window.Views.logbook.openHealthLog());
    root.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));

    // request rows / view buttons -> detail
    root.querySelectorAll("[data-pr]").forEach(el => el.addEventListener("click", (e) => {
      e.stopPropagation();
      window.Views.requests.openDetail(el.dataset.pr);
    }));
    // engineer accept/complete
    root.querySelectorAll("[data-accept]").forEach(b => b.onclick = (e) => { e.stopPropagation(); engineerAdvance(b.dataset.accept, "Work In-Progress"); });
    root.querySelectorAll("[data-complete]").forEach(b => b.onclick = (e) => { e.stopPropagation(); engineerAdvance(b.dataset.complete, "Completion Review"); });
  }

  function engineerAdvance(id, to) {
    const p = DB.PR.find(x => x.id === id); if (!p) return;
    const from = p.stage; p.stage = to;
    const msg = to === "Work In-Progress" ? "accepted — work started" : "marked complete, awaiting sign-off";
    pushNotification({ icon:"refresh", tone:U.PR_STAGE_TONE[to], title:`${id} status updated`, body:`${from} → ${to}` });
    U.toast({ title:`${id} updated`, body:`${p.title} — ${msg}.`, tone:"primary", icon:"check" });
    refresh();
  }

  // ---------- public API ----------
  function go(view) { state.view = view; renderShell(); }
  function refresh() {
    // re-render current view + nav counts/chrome, keep popovers closed
    renderShell();
  }
  function pushNotification(n) {
    state.notis.unshift(Object.assign({ id: Date.now(), time: "just now", unread: true }, n));
    if (state.notis.length > 12) state.notis.pop();
  }

  window.App = { state, go, refresh, pushNotification };

  // boot
  document.addEventListener("DOMContentLoaded", renderShell);
})();
