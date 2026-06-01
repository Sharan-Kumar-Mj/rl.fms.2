/* ============================================================
   FMS — Digital Log Books
   Solar reading log + equipment health log (replace paper)
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;
  let tab = "solar";

  function render() {
    return `
      <div class="page-head">
        <div>
          <div class="ph-title">Digital Log Books</div>
          <div class="ph-desc">Paperless daily logs — solar generation readings and equipment health checks, captured on shift.</div>
        </div>
        <div class="ph-actions">
          <div class="pill-group">
            <button class="${tab==="solar"?"active":""}" data-tab="solar">${I("sun",15)} Solar reading</button>
            <button class="${tab==="health"?"active":""}" data-tab="health">${I("activity",15)} Equipment health</button>
          </div>
        </div>
      </div>
      ${tab === "solar" ? solarView() : healthView()}`;
  }

  // ---------- Solar ----------
  function solarView() {
    const total = DB.SOLAR.reduce((s,d)=>s+d.kwh,0);
    const avg = Math.round(total/DB.SOLAR.length);
    const today = DB.SOLAR[DB.SOLAR.length-1];
    const vals = DB.SOLAR.map(d=>d.kwh);
    const peak = Math.max(...vals);

    return `<div class="grid cols-3 view-anim">
      <div class="card span-2">
        <div class="card-head">${I("sun",18)}<h3>Solar generation — last 7 days</h3><div class="right"><span class="badge b-ok">${I("bolt",12)} ${total.toLocaleString()} kWh total</span></div></div>
        ${U.spark(vals, "warn", 560, 90)}
        <div class="barchart" style="margin-top:14px">
          ${DB.SOLAR.map(d=>{
            const px = Math.max(5, Math.round(d.kwh/peak*120));
            return `<div class="col"><div class="val">${d.kwh}</div><div class="stack" style="height:${px}px"><div class="seg" style="height:${px}px;background:linear-gradient(180deg,#F5B53D,#d9941f)"></div></div><div class="cap">${d.date}</div></div>`;
          }).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-head">${I("bolt",18)}<h3>Today’s reading</h3></div>
        <div style="text-align:center;padding:8px 0 16px">
          <div style="font-family:var(--font-display);font-size:44px;font-weight:600;color:var(--warn)" class="tnum">${today.kwh}</div>
          <div class="dim">kWh generated · ${today.date}</div>
        </div>
        <div class="kv"><span class="k">Peak irradiance</span><span class="v">${today.irr} kWh/m²</span></div>
        <div class="kv"><span class="k">7-day average</span><span class="v">${avg} kWh</span></div>
        <div class="kv"><span class="k">Best day</span><span class="v">${peak} kWh</span></div>
        <button class="btn btn-primary" style="width:100%;margin-top:16px" data-act="solar-log">${I("plus",16)} Log today’s reading</button>
      </div>
    </div>

    <div class="card mt-16 pad-0 view-anim"><div class="card-head" style="padding:18px 18px 0">${I("history",18)}<h3>Reading history</h3></div>
      <div class="table-wrap"><table class="data responsive">
        <thead><tr><th>Date</th><th>Generation</th><th>Peak irradiance</th><th>vs avg</th><th>Logged by</th></tr></thead>
        <tbody>${[...DB.SOLAR].reverse().map(d=>{
          const diff = Math.round((d.kwh-avg)/avg*100);
          return `<tr>
            <td data-label="Date" class="fw-6">${d.date}</td>
            <td data-label="Generation"><span class="mono">${d.kwh}</span> kWh</td>
            <td data-label="Irradiance">${d.irr} kWh/m²</td>
            <td data-label="vs avg"><span class="delta ${diff>=0?'up':'down'}">${I(diff>=0?'arrowUp':'arrowDown',12)} ${Math.abs(diff)}%</span></td>
            <td data-label="By">R. Menon</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>`;
  }

  function openSolarLog() {
    const body = `<form id="sl-form"><div class="form-grid">
      <div class="field"><label>Date</label><input class="input" type="date" name="date" value="2026-05-29"></div>
      <div class="field"><label>Generation (kWh) <span class="req">*</span></label><input class="input" type="number" name="kwh" placeholder="e.g. 870" required></div>
      <div class="field"><label>Peak irradiance (kWh/m²)</label><input class="input" type="number" step="0.1" name="irr" placeholder="6.5"></div>
      <div class="field"><label>Inverter status</label><select class="select" name="st"><option>All healthy</option><option>1 fault flagged</option><option>Derated</option></select></div>
      <div class="field full"><label>Notes</label><textarea class="textarea" name="notes" style="min-height:64px" placeholder="Weather, cleaning, anomalies…"></textarea></div>
    </div></form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="sl-go">${I("check",16)} Save reading</button>`;
    const m = U.modal({ title:"Log solar reading", sub:"Daily generation entry", body, foot });
    m.querySelector("#sl-go").onclick = () => {
      const d = Object.fromEntries(new FormData(m.querySelector("#sl-form")));
      if(!d.kwh){ m.querySelector("[name=kwh]").classList.add("err"); return; }
      DB.SOLAR.push({ date:"May 29*", kwh:+d.kwh, irr:+d.irr||0 });
      if (DB.SOLAR.length > 8) DB.SOLAR.shift();
      U.closeModal();
      U.toast({ title:"Reading logged", body:`${d.kwh} kWh recorded for today.`, tone:"warn", icon:"sun" });
      window.App.refresh();
    };
  }

  // ---------- Equipment health ----------
  function healthView() {
    const ok = DB.HEALTHLOG.filter(h=>h.status==="ok").length;
    const warn = DB.HEALTHLOG.filter(h=>h.status==="warn").length;
    return `<div class="grid cols-3 mb-12 view-anim">
      <div class="stat tone-ok"><div class="ico t-ok">${I("check",19)}</div><div class="label">Healthy</div><div class="value tnum">${ok}</div></div>
      <div class="stat tone-warn"><div class="ico t-warn">${I("alert",19)}</div><div class="label">Needs attention</div><div class="value tnum">${warn}</div></div>
      <div class="stat tone-info"><div class="ico t-info">${I("clock",19)}</div><div class="label">Last round</div><div class="value" style="font-size:22px">06:00</div><div class="dim fs-12 mt-8">Morning shift</div></div>
    </div>

    <div class="card pad-0 view-anim">
      <div class="card-head" style="padding:18px 18px 0">${I("activity",18)}<h3>Today’s equipment health round</h3>
        <div class="right"><button class="btn btn-sm btn-primary" data-act="health-log">${I("plus",14)} New check</button></div></div>
      <div class="table-wrap"><table class="data responsive">
        <thead><tr><th>Equipment</th><th>Temperature</th><th>Pressure</th><th>Reading time</th><th>Inspector</th><th>Status</th></tr></thead>
        <tbody>${DB.HEALTHLOG.map(h=>`<tr>
          <td data-label="Equipment" class="fw-6">${U.esc(h.equip)}</td>
          <td data-label="Temp"><span class="mono">${h.temp}</span></td>
          <td data-label="Pressure"><span class="mono">${h.press}</span></td>
          <td data-label="Time">${h.time}</td>
          <td data-label="Inspector">${h.by}</td>
          <td data-label="Status">${U.badge(h.status==="ok"?"Normal":"Watch", h.status==="ok"?"ok":"warn", true)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  }

  function openHealthLog() {
    const body = `<form id="hl-form"><div class="form-grid">
      <div class="field full"><label>Equipment <span class="req">*</span></label><input class="input" name="equip" placeholder="e.g. Chiller CH-02" required></div>
      <div class="field"><label>Temperature</label><input class="input" name="temp" placeholder="e.g. 7.4°C"></div>
      <div class="field"><label>Pressure</label><input class="input" name="press" placeholder="e.g. 3.2 bar"></div>
      <div class="field"><label>Reading time</label><input class="input" type="time" name="time" value="06:00"></div>
      <div class="field"><label>Status</label><select class="select" name="status"><option value="ok">Normal</option><option value="warn">Watch / abnormal</option></select></div>
      <div class="field full"><label>Observations</label><textarea class="textarea" name="notes" style="min-height:64px"></textarea></div>
    </div></form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="hl-go">${I("check",16)} Save check</button>`;
    const m = U.modal({ title:"Log equipment health", sub:"Add a reading to today’s round", body, foot });
    m.querySelector("#hl-go").onclick = () => {
      const d = Object.fromEntries(new FormData(m.querySelector("#hl-form")));
      if(!d.equip.trim()){ m.querySelector("[name=equip]").classList.add("err"); return; }
      DB.HEALTHLOG.unshift({ time:d.time, equip:d.equip, temp:d.temp||"—", press:d.press||"—", status:d.status, by:window.App.state.roleObj.initials });
      U.closeModal();
      if (d.status==="warn") window.App.pushNotification({ icon:"alert", tone:"warn", title:"Equipment flagged", body:`${d.equip} logged as 'Watch' on health round` });
      U.toast({ title:"Health check saved", body:`${d.equip} recorded.`, tone:d.status==="warn"?"warn":"ok", icon:"activity" });
      window.App.refresh();
    };
  }

  function mount(root) {
    root.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab; window.App.refresh(); });
    U.animateCharts(root);
  }

  window.Views = window.Views || {};
  window.Views.logbook = { render, mount, openSolarLog, openHealthLog };
})();
