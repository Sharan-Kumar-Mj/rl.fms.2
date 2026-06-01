/* ============================================================
   FMS — PPM Scheduler (Planned Preventive Maintenance)
   upcoming tasks + frequency + next-service auto-calculator
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;

  const FREQ_DAYS = { "Monthly":30, "Quarterly":91, "Half-Yearly":182, "Annually":365 };

  function statusFor(nextDate) {
    const d = U.daysFromToday(nextDate);
    if (d < 0) return "overdue";
    if (d <= 10) return "due-soon";
    return "upcoming";
  }

  function render() {
    DB.PPM.forEach(p => p.status = statusFor(p.next));
    const overdue = DB.PPM.filter(p=>p.status==="overdue").length;
    const dueSoon = DB.PPM.filter(p=>p.status==="due-soon").length;
    const upcoming = DB.PPM.filter(p=>p.status==="upcoming").length;
    const sorted = [...DB.PPM].sort((a,b)=>new Date(a.next)-new Date(b.next));

    return `
      <div class="page-head">
        <div>
          <div class="ph-title">PPM Scheduler</div>
          <div class="ph-desc">Planned preventive maintenance across critical plant — frequency-driven with auto next-service dates.</div>
        </div>
        <div class="ph-actions">
          <button class="btn" data-act="ppm-calc">${I("refresh",16)} Service date calculator</button>
          <button class="btn btn-primary" data-act="ppm-new">${I("plus",16)} Schedule PPM</button>
        </div>
      </div>

      <div class="grid cols-3 mb-12 view-anim">
        <div class="stat tone-danger"><div class="ico t-danger">${I("alert",19)}</div><div class="label">Overdue</div><div class="value tnum">${overdue}</div><div class="dim fs-12 mt-8">Immediate action</div></div>
        <div class="stat tone-warn"><div class="ico t-warn">${I("clock",19)}</div><div class="label">Due within 10 days</div><div class="value tnum">${dueSoon}</div><div class="dim fs-12 mt-8">Plan resources</div></div>
        <div class="stat tone-info"><div class="ico t-info">${I("calendar",19)}</div><div class="label">Upcoming</div><div class="value tnum">${upcoming}</div><div class="dim fs-12 mt-8">On schedule</div></div>
      </div>

      <div class="card pad-0 view-anim"><div class="table-wrap">
        <table class="data responsive">
          <thead><tr><th>Task</th><th>Type</th><th>Frequency</th><th>Last service</th><th>Next service</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>${sorted.map(rowHtml).join("")}</tbody>
        </table>
      </div></div>`;
  }

  function rowHtml(p) {
    const days = U.daysFromToday(p.next);
    const dlabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `in ${days}d`;
    return `<tr>
      <td data-label="Task"><div class="cell-main">${U.esc(p.asset)}</div><div class="cell-id">${p.id}</div></td>
      <td data-label="Type">${U.catBadge(p.type)}</td>
      <td data-label="Frequency"><span class="badge b-secondary">${p.freq}</span></td>
      <td data-label="Last">${U.fmtDate(p.last)}</td>
      <td data-label="Next"><div class="fw-6">${U.fmtDate(p.next)}</div><div class="cell-sub" style="color:${p.status==='overdue'?'var(--danger)':p.status==='due-soon'?'var(--warn)':'var(--text-dim)'}">${dlabel}</div></td>
      <td data-label="Owner">${U.avatar(p.owner)} <span class="fs-13">${p.owner.split(" ")[0]}</span></td>
      <td data-label="Status">${U.badge(p.status==="due-soon"?"Due soon":p.status==="overdue"?"Overdue":"Upcoming", U.PPM_TONE[p.status], true)}</td>
      <td><div class="row-actions">${p.status!=="upcoming"?`<button class="btn btn-sm btn-ok" data-ppm-done="${p.id}">${I("check",14)} Complete</button>`:`<button class="btn btn-sm" data-ppm-done="${p.id}">${I("check",14)} Log</button>`}</div></td>
    </tr>`;
  }

  // next-service auto calculator
  function openCalc() {
    const freqOpts = Object.keys(FREQ_DAYS).map(f=>`<option value="${f}">${f} (every ${FREQ_DAYS[f]} days)</option>`).join("");
    const body = `<div class="form-grid">
      <div class="field"><label>Last service date</label><input class="input" type="date" id="c-last" value="2026-05-29"></div>
      <div class="field"><label>Frequency</label><select class="select" id="c-freq">${freqOpts}</select></div>
      <div class="field full">
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:18px;text-align:center">
          <div class="card-section-title">Calculated next service</div>
          <div id="c-result" style="font-family:var(--font-display);font-size:30px;font-weight:600;color:var(--primary-hi)">—</div>
          <div id="c-days" class="dim fs-13 mt-8"></div>
        </div>
      </div>
    </div>`;
    const m = U.modal({ title:"Next-service calculator", sub:"Auto-computes the next due date from frequency.", body, foot:`<button class="btn btn-primary" onclick="UI.closeModal()">Done</button>` });
    const last = m.querySelector("#c-last"), freq = m.querySelector("#c-freq"), res = m.querySelector("#c-result"), daysEl = m.querySelector("#c-days");
    function calc() {
      const d = new Date(last.value + "T00:00:00");
      if (isNaN(d)) return;
      const add = FREQ_DAYS[freq.value];
      const next = new Date(d.getTime() + add * 86400000);
      res.textContent = next.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
      const fromNow = Math.round((next - U.TODAY)/86400000);
      daysEl.textContent = fromNow >= 0 ? `${fromNow} days from today` : `${Math.abs(fromNow)} days ago`;
    }
    last.oninput = calc; freq.onchange = calc; calc();
  }

  function openNew() {
    const typeOpts = ["HVAC","Generator","Electrical","Mechanical","Fire Safety","Plumbing"].map(c=>`<option>${c}</option>`).join("");
    const freqOpts = Object.keys(FREQ_DAYS).map(f=>`<option>${f}</option>`).join("");
    const ownerOpts = DB.ENGINEERS.map(e=>`<option>${e}</option>`).join("");
    const body = `<form id="ppm-form"><div class="form-grid">
      <div class="field full"><label>Asset / System <span class="req">*</span></label><input class="input" name="asset" placeholder="e.g. Chiller CH-02 · RL-DWC" required></div>
      <div class="field"><label>Type</label><select class="select" name="type">${typeOpts}</select></div>
      <div class="field"><label>Frequency</label><select class="select" name="freq" id="pf">${freqOpts}</select></div>
      <div class="field"><label>Last service</label><input class="input" type="date" name="last" id="pl" value="2026-05-29"></div>
      <div class="field"><label>Next service <span class="dim">(auto)</span></label><input class="input" name="next" id="pn" readonly style="opacity:.85"></div>
      <div class="field full"><label>Owner</label><select class="select" name="owner">${ownerOpts}</select></div>
    </div></form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="ppm-submit">${I("check",16)} Schedule</button>`;
    const m = U.modal({ title:"Schedule PPM task", sub:"Next-service date auto-calculates from frequency.", body, foot });
    const pf=m.querySelector("#pf"), pl=m.querySelector("#pl"), pn=m.querySelector("#pn");
    function recalc(){ const d=new Date(pl.value+"T00:00:00"); const nx=new Date(d.getTime()+FREQ_DAYS[pf.value]*86400000); pn.value=nx.toISOString().slice(0,10); }
    pf.onchange=recalc; pl.oninput=recalc; recalc();
    m.querySelector("#ppm-submit").onclick = () => {
      const f = m.querySelector("#ppm-form"); const d = Object.fromEntries(new FormData(f));
      if (!d.asset.trim()){ f.elements.asset.classList.add("err"); return; }
      const id = "PPM-"+(509+DB.PPM.length);
      DB.PPM.push({ id, asset:d.asset, type:d.type, freq:d.freq, last:d.last, next:d.next, owner:d.owner, status:statusFor(d.next) });
      U.closeModal();
      U.toast({ title:"PPM scheduled", body:`${d.asset} · next ${U.fmtDate(d.next)}.`, tone:"info", icon:"calendar" });
      window.App.refresh();
    };
  }

  function complete(id) {
    const p = DB.PPM.find(x=>x.id===id); if(!p) return;
    p.last = "2026-05-29";
    const nx = new Date(U.TODAY.getTime() + FREQ_DAYS[p.freq]*86400000);
    p.next = nx.toISOString().slice(0,10);
    p.status = statusFor(p.next);
    U.toast({ title:"PPM completed", body:`${p.asset} — next service auto-set to ${U.fmtDate(p.next)}.`, tone:"ok", icon:"check" });
    window.App.pushNotification({ icon:"calendar", tone:"ok", title:"PPM completed", body:`${p.asset} · next ${U.fmtDate(p.next)}` });
    window.App.refresh();
  }

  function mount(root) {
    root.querySelectorAll("[data-ppm-done]").forEach(b => b.onclick = () => complete(b.dataset.ppmDone));
    U.animateCharts(root);
  }

  window.Views = window.Views || {};
  window.Views.ppm = { render, mount, openCalc, openNew };
})();
