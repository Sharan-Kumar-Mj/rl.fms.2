/* ============================================================
   FMS — Asset Tracker (MHE) + Transfer history
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;
  let view = "fleet"; // fleet | transfers

  function render() {
    const ac = { operational:0, breakdown:0, inactive:0 };
    DB.MHE.forEach(m => ac[m.status]++);
    const totalHrs = DB.MHE.reduce((s,m)=>s+m.hours,0);

    return `
      <div class="page-head">
        <div>
          <div class="ph-title">Asset Tracker · MHE</div>
          <div class="ph-desc">${DB.MHE.length} material-handling units across ${DB.FACILITIES.length} facilities — live status & running hours.</div>
        </div>
        <div class="ph-actions">
          <div class="pill-group">
            <button class="${view==="fleet"?"active":""}" data-view="fleet">Fleet</button>
            <button class="${view==="transfers"?"active":""}" data-view="transfers">Transfer history</button>
          </div>
          <button class="btn btn-primary" data-act="transfer">${I("truck",16)} Log transfer</button>
        </div>
      </div>

      <div class="grid cols-4 mb-12 view-anim">
        <div class="stat tone-ok"><div class="ico t-ok">${I("forklift",19)}</div><div class="label">Operational</div><div class="value tnum">${ac.operational}</div></div>
        <div class="stat tone-danger"><div class="ico t-danger">${I("alert",19)}</div><div class="label">Breakdown</div><div class="value tnum">${ac.breakdown}</div></div>
        <div class="stat tone-idle"><div class="ico t-idle">${I("clock",19)}</div><div class="label">Inactive / idle</div><div class="value tnum">${ac.inactive}</div></div>
        <div class="stat tone-secondary"><div class="ico t-secondary">${I("gauge",19)}</div><div class="label">Running hrs (MTD)</div><div class="value tnum">${totalHrs.toLocaleString()}<small>h</small></div></div>
      </div>

      ${view === "fleet" ? fleetTable() : transfersTable()}`;
  }

  function fleetTable() {
    return `<div class="card pad-0 view-anim"><div class="table-wrap">
      <table class="data responsive">
        <thead><tr><th>Unit</th><th>Facility</th><th>Status</th><th>Health</th><th>Running hrs (MTD)</th><th>Utilization</th><th>Last service</th></tr></thead>
        <tbody>${DB.MHE.map(rowHtml).join("")}</tbody>
      </table>
    </div></div>`;
  }

  function rowHtml(m) {
    const hpct = Math.round(m.hours/m.target*100);
    const htone = m.health > 80 ? "ok" : m.health > 55 ? "warn" : "danger";
    return `<tr>
      <td data-label="Unit"><div class="cell-main mono">${m.id}</div><div class="cell-sub">${U.esc(m.type)} · ${U.esc(m.make)}</div></td>
      <td data-label="Facility">${m.facility}</td>
      <td data-label="Status">${U.assetBadge(m.status)}</td>
      <td data-label="Health">${U.gauge(m.health, htone)}</td>
      <td data-label="Running hrs"><div style="min-width:120px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span class="mono">${m.hours}h</span><span class="dim">/ ${m.target}h</span></div><div class="bar ${hpct>90?'danger':hpct>75?'warn':'ok'}"><i style="width:${Math.min(hpct,100)}%"></i></div></div></td>
      <td data-label="Utilization"><span class="mono fw-6">${m.util}%</span></td>
      <td data-label="Last service">${U.fmtDate(m.lastService)}</td>
    </tr>`;
  }

  function transfersTable() {
    return `<div class="card pad-0 view-anim"><div class="table-wrap">
      <table class="data responsive">
        <thead><tr><th>Asset</th><th>From</th><th></th><th>To</th><th>Logged by</th><th>Reason</th><th>Timestamp</th></tr></thead>
        <tbody>${DB.TRANSFERS.map(t => `<tr>
          <td data-label="Asset"><span class="mono fw-6">${t.asset}</span></td>
          <td data-label="From"><span class="badge b-idle">${t.from}</span></td>
          <td class="dim" style="text-align:center">${I("arrowRight",15)}</td>
          <td data-label="To"><span class="badge b-secondary">${t.to}</span></td>
          <td data-label="By">${t.by}</td>
          <td data-label="Reason" class="muted fs-13">${U.esc(t.reason)}</td>
          <td data-label="Time"><span class="mono dim fs-12">${t.date}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div></div>`;
  }

  function openTransfer() {
    const assetOpts = DB.MHE.map(m=>`<option value="${m.id}">${m.id} — ${m.type}</option>`).join("");
    const facOpts = DB.FACILITIES.map(f=>`<option>${f.code}</option>`).join("") + "<option>Workshop</option>";
    const body = `<form id="tr-form"><div class="form-grid">
      <div class="field full"><label>Asset <span class="req">*</span></label><select class="select" name="asset">${assetOpts}</select></div>
      <div class="field"><label>From location</label><select class="select" name="from">${facOpts}</select></div>
      <div class="field"><label>To location <span class="req">*</span></label><select class="select" name="to">${facOpts}</select></div>
      <div class="field full"><label>Reason</label><input class="input" name="reason" placeholder="e.g. Peak inbound support"></div>
    </div></form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="tr-submit">${I("check",16)} Log transfer</button>`;
    const m = U.modal({ title:"Log asset transfer", sub:"Record an MHE relocation with timestamp.", body, foot });
    m.querySelector("#tr-submit").onclick = () => {
      const d = Object.fromEntries(new FormData(m.querySelector("#tr-form")));
      DB.TRANSFERS.unshift({ asset:d.asset, from:d.from, to:d.to, date:"2026-05-29 "+new Date().toTimeString().slice(0,5), by:window.App.state.roleObj.name.split(" ").map((w,i)=>i===0?w[0]+".":w).join(" "), reason:d.reason||"—" });
      const asset = DB.MHE.find(a=>a.id===d.asset); if (asset) asset.facility = d.to;
      U.closeModal();
      view = "transfers";
      window.App.pushNotification({ icon:"truck", tone:"secondary", title:"Asset transferred", body:`${d.asset}: ${d.from} → ${d.to}` });
      U.toast({ title:"Transfer logged", body:`${d.asset} moved to ${d.to}.`, tone:"secondary", icon:"truck" });
      window.App.refresh();
    };
  }

  function mount(root) {
    root.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; window.App.refresh(); });
    U.animateCharts(root);
  }

  window.Views = window.Views || {};
  window.Views.assets = { render, mount, openTransfer };
})();
