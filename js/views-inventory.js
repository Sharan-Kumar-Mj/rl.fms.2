/* ============================================================
   FMS — MEP Spare Parts Inventory
   stock grid + low-stock flags + category tabs
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;
  let cat = "All";

  function render() {
    const low = DB.INVENTORY.filter(i => i.qty < i.min);
    const atMin = DB.INVENTORY.filter(i => i.qty >= i.min && i.qty <= i.min * 1.5);
    const list = cat === "All" ? DB.INVENTORY : DB.INVENTORY.filter(i => i.cat === cat);
    const cats = ["All", ...DB.INV_CATS];

    return `
      <div class="page-head">
        <div>
          <div class="ph-title">MEP Spare Parts Inventory</div>
          <div class="ph-desc">${DB.INVENTORY.length} SKUs · real-time stock levels with low-stock flags against minimum recommended levels.</div>
        </div>
        <div class="ph-actions">
          <button class="btn">${I("download",16)} Export</button>
          <button class="btn btn-primary" data-act="inv-new">${I("plus",16)} Add part</button>
        </div>
      </div>

      <div class="grid cols-3 mb-12 view-anim">
        <div class="stat tone-danger"><div class="ico t-danger">${I("flag",19)}</div><div class="label">Below minimum</div><div class="value tnum">${low.length}</div><div class="dim fs-12 mt-8">Reorder required</div></div>
        <div class="stat tone-warn"><div class="ico t-warn">${I("alert",19)}</div><div class="label">Near minimum</div><div class="value tnum">${atMin.length}</div><div class="dim fs-12 mt-8">Watch closely</div></div>
        <div class="stat tone-ok"><div class="ico t-ok">${I("boxes",19)}</div><div class="label">Healthy stock</div><div class="value tnum">${DB.INVENTORY.length - low.length - atMin.length}</div><div class="dim fs-12 mt-8">Above buffer</div></div>
      </div>

      ${low.length ? `<div class="card view-anim" style="border-color:var(--danger-dim);background:linear-gradient(120deg,var(--danger-dim),transparent 55%);margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="ico t-danger" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center;flex-shrink:0">${I("alert",19)}</div>
          <div style="flex:1"><b style="color:var(--danger)">Low stock alert</b><div class="fs-13 muted">${low.map(i=>i.name).slice(0,3).join(", ")}${low.length>3?` +${low.length-3} more`:""} below minimum recommended level.</div></div>
        </div>
      </div>`:""}

      <div class="tabs">
        ${cats.map(c => `<button class="tab ${cat===c?"active":""}" data-cat="${c}">${c}<span class="count">${c==="All"?DB.INVENTORY.length:DB.INVENTORY.filter(i=>i.cat===c).length}</span></button>`).join("")}
      </div>

      <div class="grid cols-3 view-anim">
        ${list.map(card).join("")}
      </div>`;
  }

  function card(it) {
    const ratio = it.qty / it.min;
    const tone = it.qty < it.min ? "danger" : ratio <= 1.5 ? "warn" : "ok";
    const flag = it.qty < it.min ? `<span class="badge b-danger">${I("flag",12)} Low stock</span>` : ratio <= 1.5 ? `<span class="badge b-warn">Near min</span>` : `<span class="badge b-ok">In stock</span>`;
    const pct = Math.min(Math.round(it.qty / (it.min*2) * 100), 100);
    return `<div class="card tone-${tone}" style="padding:16px">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
        <div class="ico t-${U.CAT_TONE[it.cat]||'idle'}" style="width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex-shrink:0">${I(catIcon(it.cat),17)}</div>
        <div style="flex:1;min-width:0">
          <div class="fw-6" style="line-height:1.3">${U.esc(it.name)}</div>
          <div class="cell-id">${it.id} · ${it.facility} · ${it.loc}</div>
        </div>
        ${flag}
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:8px">
        <div><span style="font-family:var(--font-display);font-size:26px;font-weight:600" class="tnum">${it.qty}</span> <span class="dim fs-13">${it.unit}</span></div>
        <div class="dim fs-12">min ${it.min} ${it.unit}</div>
      </div>
      <div class="bar ${tone}"><i style="width:${pct}%"></i></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-sm" style="flex:1" data-inv-adj="${it.id}" data-dir="out">${I("arrowDown",14)} Issue</button>
        <button class="btn btn-sm" style="flex:1" data-inv-adj="${it.id}" data-dir="in">${I("arrowUp",14)} Restock</button>
      </div>
    </div>`;
  }

  function catIcon(c) {
    return { Electrical:"bolt", Plumbing:"droplet", Painting:"spark", HVAC:"thermometer", Mechanical:"wrench", Safety:"alert" }[c] || "boxes";
  }

  function adjust(id, dir) {
    const it = DB.INVENTORY.find(x=>x.id===id); if(!it) return;
    const body = `<div class="field">
      <label>${dir==="in"?"Restock quantity":"Issue quantity"} (${it.unit})</label>
      <input class="input" type="number" id="adj-q" value="1" min="1" max="${dir==="out"?it.qty:999}">
      <div class="hint mt-8">${it.name} — current stock: <b>${it.qty} ${it.unit}</b> · min ${it.min}</div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="adj-go">${I("check",16)} Confirm</button>`;
    const m = U.modal({ title: dir==="in"?"Restock part":"Issue part", sub:it.id, body, foot });
    m.querySelector("#adj-go").onclick = () => {
      const q = parseInt(m.querySelector("#adj-q").value)||0;
      it.qty = Math.max(0, dir==="in" ? it.qty+q : it.qty-q);
      U.closeModal();
      if (it.qty < it.min) {
        window.App.pushNotification({ icon:"alert", tone:"danger", title:"Low stock alert", body:`${it.name} below minimum at ${it.facility} (${it.qty}/${it.min})` });
        U.toast({ title:"Now below minimum", body:`${it.name} dropped to ${it.qty} ${it.unit}.`, tone:"danger", icon:"flag" });
      } else {
        U.toast({ title:dir==="in"?"Stock added":"Stock issued", body:`${it.name} — now ${it.qty} ${it.unit}.`, tone:"ok", icon:"check" });
      }
      window.App.refresh();
    };
  }

  function openNew() {
    const catOpts = DB.INV_CATS.map(c=>`<option>${c}</option>`).join("");
    const facOpts = DB.FACILITIES.map(f=>`<option>${f.code}</option>`).join("");
    const body = `<form id="inv-form"><div class="form-grid">
      <div class="field full"><label>Part name <span class="req">*</span></label><input class="input" name="name" placeholder="e.g. Contactor 40A 3-pole" required></div>
      <div class="field"><label>Category</label><select class="select" name="cat">${catOpts}</select></div>
      <div class="field"><label>Facility</label><select class="select" name="facility">${facOpts}</select></div>
      <div class="field"><label>Quantity</label><input class="input" type="number" name="qty" value="0" min="0"></div>
      <div class="field"><label>Min level</label><input class="input" type="number" name="min" value="5" min="0"></div>
      <div class="field"><label>Unit</label><input class="input" name="unit" value="pcs"></div>
      <div class="field"><label>Location</label><input class="input" name="loc" value="Rack —"></div>
    </div></form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button><button class="btn btn-primary" id="inv-submit">${I("check",16)} Add part</button>`;
    const m = U.modal({ title:"Add spare part", body, foot });
    m.querySelector("#inv-submit").onclick = () => {
      const d = Object.fromEntries(new FormData(m.querySelector("#inv-form")));
      if(!d.name.trim()) return;
      const pre = { Electrical:"EL", Plumbing:"PL", Painting:"PT", HVAC:"HV", Mechanical:"MC", Safety:"SF" }[d.cat]||"XX";
      DB.INVENTORY.unshift({ id:pre+"-"+(7000+DB.INVENTORY.length), name:d.name, cat:d.cat, facility:d.facility, qty:+d.qty, min:+d.min, unit:d.unit, loc:d.loc });
      cat = "All";
      U.closeModal();
      U.toast({ title:"Part added", body:`${d.name} added to inventory.`, tone:"ok", icon:"boxes" });
      window.App.refresh();
    };
  }

  function mount(root) {
    root.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { cat = b.dataset.cat; window.App.refresh(); });
    root.querySelectorAll("[data-inv-adj]").forEach(b => b.onclick = () => adjust(b.dataset.invAdj, b.dataset.dir));
    U.animateCharts(root);
  }

  window.Views = window.Views || {};
  window.Views.inventory = { render, mount, openNew };
})();
