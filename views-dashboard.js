/* ============================================================
   FMS — Dashboard views (role-based)
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;

  function statTile(t) {
    return `<div class="stat tone-${t.tone} view-anim" style="animation-delay:${t.delay||0}ms">
      <div class="ico t-${t.tone}">${I(t.icon, 19)}</div>
      <div class="label">${t.label}</div>
      <div class="value tnum">${t.value}${t.unit ? `<small>${t.unit}</small>` : ""}</div>
      ${t.delta ? `<div class="delta ${t.deltaDir}">${I(t.deltaDir === "up" ? "arrowUp" : t.deltaDir === "down" ? "arrowDown" : "trend", 13)} ${t.delta}</div>` : `<div class="dim fs-12 mt-8">${t.note || ""}</div>`}
    </div>`;
  }

  // ---- aggregate helpers ----
  function stageCounts() {
    const c = {};
    DB.STAGES.forEach(s => c[s] = 0);
    DB.PR.forEach(p => c[p.stage]++);
    return c;
  }
  function assetCounts() {
    const c = { operational: 0, breakdown: 0, inactive: 0 };
    DB.MHE.forEach(m => c[m.status]++);
    return c;
  }

  // ============================================================
  //  REQUESTER
  // ============================================================
  function requesterView() {
    const mine = DB.PR; // demo: treat all as the requester's portfolio
    const active = mine.filter(p => p.stage !== "Closed");
    const inProg = mine.filter(p => p.stage === "Work In-Progress" || p.stage === "Assigned").length;
    const review = mine.filter(p => p.stage === "Completion Review").length;
    const closed = mine.filter(p => p.stage === "Closed").length;

    const recent = mine.slice(0, 5).map(p => requestRow(p)).join("");

    return `
      <div class="card view-anim" style="background:linear-gradient(120deg,var(--primary-dim),transparent 60%);border-color:var(--primary-line)">
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <div style="flex:1;min-width:220px">
            <div class="card-section-title" style="color:var(--primary-hi)">Welcome back, Maya</div>
            <h2 style="font-family:var(--font-display);font-size:22px">You have ${active.length} active requests</h2>
            <p class="muted mt-8" style="max-width:520px">Raise a new facility issue, track its progress through the workflow, and get notified the moment status changes.</p>
          </div>
          <button class="btn btn-primary btn-lg" data-act="new-request">${I("plus",16)} New Request</button>
        </div>
      </div>

      <div class="grid cols-4 mt-16">
        ${statTile({ icon:"ticket", tone:"primary", label:"Active requests", value:active.length, note:"Across all facilities", delay:40 })}
        ${statTile({ icon:"wrench", tone:"info", label:"Being worked on", value:inProg, note:"Assigned + in-progress", delay:80 })}
        ${statTile({ icon:"clock", tone:"warn", label:"Awaiting your sign-off", value:review, note:"Completion review", delay:120 })}
        ${statTile({ icon:"check", tone:"ok", label:"Closed", value:closed, note:"Resolved & verified", delay:160 })}
      </div>

      <div class="card mt-16 pad-0 view-anim" style="animation-delay:180ms">
        <div class="card-head" style="padding:18px 18px 0">
          <h3>My recent requests</h3>
          <div class="right"><button class="btn btn-sm btn-ghost" data-go="requests">View all ${I("arrowRight",14)}</button></div>
        </div>
        <div style="padding:6px 0 8px">${recent}</div>
      </div>`;
  }

  function requestRow(p) {
    const idx = DB.STAGES.indexOf(p.stage);
    const pctW = Math.round((idx / (DB.STAGES.length - 1)) * 100);
    const tone = U.PR_STAGE_TONE[p.stage];
    return `<button class="req-row" data-pr="${p.id}" style="display:flex;align-items:center;gap:16px;width:100%;text-align:left;padding:14px 18px;border-bottom:1px solid var(--border-faint);transition:background .12s" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:5px">
          <span class="mono dim fs-12">${p.id}</span>
          ${U.catBadge(p.cat)}
          ${U.prio(p.priority)}
        </div>
        <div class="fw-6" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(p.title)}</div>
        <div class="dim fs-12 mt-8" style="display:flex;align-items:center;gap:6px">${I("pin",12)} ${DB.facilityName(p.facility)}</div>
      </div>
      <div style="width:160px;flex-shrink:0" class="hide-sm">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="fs-12 muted">${p.stage}</span></div>
        <div class="bar ${tone}"><i style="width:${pctW}%"></i></div>
      </div>
      ${U.stageBadge(p.stage)}
    </button>`;
  }

  // ============================================================
  //  ADMIN / MANAGER  (real-time visibility)
  // ============================================================
  function managerView(role) {
    const sc = stageCounts();
    const ac = assetCounts();
    const open = DB.PR.filter(p => p.stage !== "Closed").length;
    const high = DB.PR.filter(p => p.priority === "high" && p.stage !== "Closed").length;
    const lowStock = DB.INVENTORY.filter(i => i.qty < i.min).length;
    const ppmOverdue = DB.PPM.filter(p => p.status === "overdue").length;

    // donut: incidents by status (open stages only for clarity)
    const donutData = [
      { label:"Submitted", value: sc["Submitted"], tone:"idle" },
      { label:"Review", value: sc["Review"], tone:"info" },
      { label:"Assigned", value: sc["Assigned"], tone:"secondary" },
      { label:"In-Progress", value: sc["Work In-Progress"], tone:"primary" },
      { label:"Completion Review", value: sc["Completion Review"], tone:"warn" },
      { label:"Closed", value: sc["Closed"], tone:"ok" },
    ].filter(d => d.value > 0);

    // MHE breakdown vs operational by facility (stacked)
    const byFac = {};
    DB.MHE.forEach(m => {
      byFac[m.facility] = byFac[m.facility] || { operational:0, breakdown:0, inactive:0 };
      byFac[m.facility][m.status]++;
    });
    const cols = Object.keys(byFac).map(f => ({
      cap: f.replace("RL-",""),
      segs: [
        { value: byFac[f].operational, tone:"ok" },
        { value: byFac[f].breakdown, tone:"danger" },
        { value: byFac[f].inactive, tone:"idle" },
      ],
    }));

    // utilization hbars
    const util = [...DB.MHE].sort((a,b)=>b.util-a.util).slice(0,5).map(m => ({
      label: `${m.id} · ${m.type.split("·")[0].trim()}`, value: m.util, suffix:"%",
      tone: m.util > 75 ? "ok" : m.util > 40 ? "warn" : "danger",
    }));

    const triage = DB.PR.filter(p => ["Submitted","Review","Completion Review"].includes(p.stage)).slice(0,5);

    const isAdmin = role === "admin";

    return `
      <div class="grid cols-4 view-anim">
        ${statTile({ icon:"ticket", tone:"primary", label:"Open requests", value:open, delta:"+3 today", deltaDir:"up", delay:0 })}
        ${statTile({ icon:"alert", tone:"danger", label:"High priority", value:high, note:"Need attention", delay:40 })}
        ${statTile({ icon:"forklift", tone:"ok", label:"MHE operational", value:`${ac.operational}/${DB.MHE.length}`, note:`${ac.breakdown} breakdown · ${ac.inactive} idle`, delay:80 })}
        ${statTile({ icon:"boxes", tone:"warn", label:"Low-stock items", value:lowStock, note:`${ppmOverdue} PPM overdue`, delay:120 })}
      </div>

      <div class="grid cols-2 mt-16">
        <div class="card view-anim" style="animation-delay:140ms">
          <div class="card-head">${I("pie",18)}<h3>Incidents by status</h3><div class="right"><span class="dim fs-12">${DB.PR.length} total</span></div></div>
          ${U.donut(donutData, open, "Open")}
        </div>
        <div class="card view-anim" style="animation-delay:180ms">
          <div class="card-head">${I("chart",18)}<h3>MHE fleet by facility</h3>
            <div class="right" style="font-size:11px;display:flex;gap:12px">
              <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:var(--ok)"></span>Operational</span>
              <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:var(--danger)"></span>Breakdown</span>
              <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:var(--idle)"></span>Idle</span>
            </div>
          </div>
          ${U.barsStacked(cols)}
        </div>
      </div>

      <div class="grid cols-3 mt-16">
        <div class="card span-2 pad-0 view-anim" style="animation-delay:220ms">
          <div class="card-head" style="padding:18px 18px 0">${I("inbox",18)}<h3>${isAdmin ? "Triage queue" : "Needs decision"}</h3>
            <div class="right"><button class="btn btn-sm btn-ghost" data-go="requests">Open module ${I("arrowRight",14)}</button></div></div>
          <div class="table-wrap">
            <table class="data responsive">
              <thead><tr><th>Request</th><th>Facility</th><th>Priority</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${triage.map(p => `<tr data-pr="${p.id}" style="cursor:pointer">
                  <td data-label="Request"><div class="cell-main">${U.esc(p.title)}</div><div class="cell-id">${p.id} · ${U.fmtDate(p.created)}</div></td>
                  <td data-label="Facility">${p.facility}</td>
                  <td data-label="Priority">${U.prio(p.priority)}</td>
                  <td data-label="Status">${U.stageBadge(p.stage)}</td>
                  <td><div class="row-actions"><button class="btn btn-sm" data-pr="${p.id}">${I("eye",14)} View</button></div></td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card view-anim" style="animation-delay:260ms">
          <div class="card-head">${I("gauge",18)}<h3>Top MHE utilization</h3></div>
          ${U.hbars(util, 100)}
          <div class="divider"></div>
          <div class="kv"><span class="k">Fleet avg utilization</span><span class="v">${Math.round(DB.MHE.reduce((s,m)=>s+m.util,0)/DB.MHE.length)}%</span></div>
          <div class="kv"><span class="k">Total running hrs (MTD)</span><span class="v tnum">${DB.MHE.reduce((s,m)=>s+m.hours,0).toLocaleString()} h</span></div>
        </div>
      </div>`;
  }

  // ============================================================
  //  ENGINEER
  // ============================================================
  function engineerView() {
    const me = "Faisal Karim";
    const mine = DB.PR.filter(p => p.engineer === me && p.stage !== "Closed");
    const todo = DB.PR.filter(p => p.engineer === me);
    const inProg = mine.filter(p => p.stage === "Work In-Progress").length;
    const assigned = mine.filter(p => p.stage === "Assigned").length;
    const myPPM = DB.PPM.filter(p => p.owner === me);

    return `
      <div class="grid cols-4 view-anim">
        ${statTile({ icon:"wrench", tone:"primary", label:"My open jobs", value:mine.length, note:"Assigned to you", delay:0 })}
        ${statTile({ icon:"play", tone:"info", label:"In progress", value:inProg, note:"Currently working", delay:40 })}
        ${statTile({ icon:"inbox", tone:"secondary", label:"Awaiting accept", value:assigned, note:"New assignments", delay:80 })}
        ${statTile({ icon:"calendar", tone:"warn", label:"PPM this week", value:myPPM.filter(p=>p.status!=="upcoming").length, note:"Scheduled maintenance", delay:120 })}
      </div>

      <div class="card mt-16 view-anim" style="animation-delay:140ms">
        <div class="card-head">${I("wrench",18)}<h3>My work orders</h3><div class="right"><span class="dim fs-12">Accept → Start → Complete</span></div></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${mine.length ? mine.map(p => engineerCard(p)).join("") : `<div class="empty">${I("check",40)}<b>All caught up</b>No open jobs assigned to you.</div>`}
        </div>
      </div>`;
  }

  function engineerCard(p) {
    let action = "";
    if (p.stage === "Assigned") action = `<button class="btn btn-primary btn-sm" data-accept="${p.id}">${I("check",14)} Accept job</button>`;
    else if (p.stage === "Work In-Progress") action = `<button class="btn btn-ok btn-sm" data-complete="${p.id}">${I("check",14)} Mark complete</button>`;
    else if (p.stage === "Completion Review") action = `<span class="badge b-warn">${I("clock",13)} Awaiting manager sign-off</span>`;
    const overdue = U.daysFromToday(p.due) < 0;
    const ptone = p.priority === "high" ? "danger" : p.priority === "medium" ? "warn" : "info";
    return `<div class="tone-${ptone}" style="border:1px solid var(--border);border-radius:var(--r);padding:15px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">
            <span class="mono dim fs-12">${p.id}</span>${U.catBadge(p.cat)}${U.prio(p.priority)}
          </div>
          <div class="fw-6" style="font-size:15px">${U.esc(p.title)}</div>
          <div class="dim fs-12 mt-8" style="display:flex;gap:14px;flex-wrap:wrap">
            <span style="white-space:nowrap">${I("pin",12)} ${p.facility}</span>
            <span style="color:${overdue?'var(--danger)':'inherit'};white-space:nowrap">${I("clock",12)} Due ${U.fmtDate(p.due)}${overdue?" · overdue":""}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          ${U.stageBadge(p.stage)}
          ${action}
        </div>
      </div>
    </div>`;
  }

  // ============================================================
  //  FINANCE
  // ============================================================
  function financeView() {
    const closed = DB.PR.filter(p => p.cost > 0);
    const total = DB.PR.reduce((s,p)=>s+p.cost,0);
    const byFac = {};
    DB.PR.forEach(p => { if (p.cost>0){ byFac[p.facility]=(byFac[p.facility]||0)+p.cost; } });
    const facBars = Object.entries(byFac).sort((a,b)=>b[1]-a[1]).map(([f,v])=>({label:f,value:v,suffix:"",tone:"secondary"}));
    const byCat = {};
    DB.PR.forEach(p => { if (p.cost>0){ byCat[p.cat]=(byCat[p.cat]||0)+p.cost; } });
    const catDonut = Object.entries(byCat).map(([c,v])=>({label:c,value:v,tone:U.CAT_TONE[c]||"idle"}));
    const budget = 45000;
    const pct = Math.round(total/budget*100);

    return `
      <div class="grid cols-4 view-anim">
        ${statTile({ icon:"money", tone:"warn", label:"Spend (MTD)", value:"$"+total.toLocaleString(), note:`of $${budget.toLocaleString()} budget`, delay:0 })}
        ${statTile({ icon:"ticket", tone:"primary", label:"Billable jobs", value:closed.length, note:"With recorded cost", delay:40 })}
        ${statTile({ icon:"trend", tone:"ok", label:"Avg cost / job", value:"$"+Math.round(total/closed.length).toLocaleString(), note:"Across facilities", delay:80 })}
        ${statTile({ icon:"gauge", tone:"info", label:"Budget used", value:pct, unit:"%", note:`$${(budget-total).toLocaleString()} remaining`, delay:120 })}
      </div>

      <div class="card mt-16 view-anim" style="animation-delay:130ms">
        <div class="card-head">${I("gauge",18)}<h3>FM budget consumption</h3><div class="right dim fs-12">May 2026</div></div>
        <div class="bar ${pct>90?'danger':pct>70?'warn':'ok'}" style="height:14px"><i style="width:${pct}%"></i></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px" class="fs-12 dim"><span>$0</span><span>$${budget.toLocaleString()}</span></div>
      </div>

      <div class="grid cols-2 mt-16">
        <div class="card view-anim" style="animation-delay:160ms">
          <div class="card-head">${I("chart",18)}<h3>Spend by facility</h3></div>
          ${U.hbars(facBars)}
        </div>
        <div class="card view-anim" style="animation-delay:200ms">
          <div class="card-head">${I("pie",18)}<h3>Spend by trade</h3></div>
          ${U.donut(catDonut, "$"+(total/1000).toFixed(1)+"k", "Total")}
        </div>
      </div>

      <div class="card mt-16 pad-0 view-anim" style="animation-delay:240ms">
        <div class="card-head" style="padding:18px 18px 0">${I("money",18)}<h3>Cost ledger</h3></div>
        <div class="table-wrap"><table class="data responsive">
          <thead><tr><th>Request</th><th>Facility</th><th>Trade</th><th>Status</th><th class="text-right">Cost</th></tr></thead>
          <tbody>${closed.map(p=>`<tr>
            <td data-label="Request"><div class="cell-main">${U.esc(p.title)}</div><div class="cell-id">${p.id}</div></td>
            <td data-label="Facility">${p.facility}</td>
            <td data-label="Trade">${U.catBadge(p.cat)}</td>
            <td data-label="Status">${U.stageBadge(p.stage)}</td>
            <td data-label="Cost" class="text-right mono fw-6">$${p.cost.toLocaleString()}</td>
          </tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  // ---- router ----
  function render(state) {
    const role = state.role;
    if (role === "requester") return requesterView();
    if (role === "engineer") return engineerView();
    if (role === "finance") return financeView();
    return managerView(role); // admin + manager
  }
  function mount(root, state) {
    U.animateCharts(root);
    // donut/gauge offset animation needs a tick
    requestAnimationFrame(() => {
      root.querySelectorAll(".donut .seg").forEach(s => {
        const final = s.getAttribute("stroke-dashoffset");
        s.style.strokeDashoffset = (parseFloat(s.style.getPropertyValue("--len")) ? final : final);
      });
    });
  }

  window.Views = window.Views || {};
  window.Views.dashboard = { render, mount, requestRow };
})();
