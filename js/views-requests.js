/* ============================================================
   FMS — Service Requests module
   list + filters + creation form + detail + workflow tracker
   ============================================================ */
(function () {
  const U = window.UI, I = window.icon, DB = window.DB;

  let filter = "all";

  function render(state) {
    const counts = { all: DB.PR.length };
    DB.STAGES.forEach(s => counts[s] = DB.PR.filter(p => p.stage === s).length);
    const open = DB.PR.filter(p => p.stage !== "Closed").length;

    const tabs = [["all","All"],["Submitted","New"],["Review","Review"],["Assigned","Assigned"],["Work In-Progress","In-Progress"],["Completion Review","Sign-off"],["Closed","Closed"]];
    const list = (filter === "all" ? DB.PR : DB.PR.filter(p => p.stage === filter));

    return `
      <div class="page-head">
        <div>
          <div class="ph-title">Service Requests</div>
          <div class="ph-desc">${open} open · ${DB.PR.length} total — track every facility issue from submission to closure.</div>
        </div>
        <div class="ph-actions">
          <button class="btn"><span>${I("filter",16)}</span> Filters</button>
          <button class="btn btn-primary" data-act="new-request">${I("plus",16)} New Request</button>
        </div>
      </div>

      <div class="tabs">
        ${tabs.map(([k,l]) => `<button class="tab ${filter===k?"active":""}" data-filter="${k}">${l}<span class="count">${counts[k]||0}</span></button>`).join("")}
      </div>

      <div class="card pad-0 view-anim">
        <div class="table-wrap">
          <table class="data responsive">
            <thead><tr><th>Request</th><th>Facility</th><th>Priority</th><th>Engineer</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${list.length ? list.map(rowHtml).join("") : `<tr><td colspan="7"><div class="empty">${I("inbox",40)}<b>No requests here</b>Nothing matches this filter.</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function rowHtml(p) {
    const overdue = p.stage !== "Closed" && U.daysFromToday(p.due) < 0;
    return `<tr data-pr="${p.id}" style="cursor:pointer">
      <td data-label="Request"><div class="cell-main">${U.esc(p.title)}</div><div class="cell-id">${p.id} · ${U.catBadge(p.cat)}</div></td>
      <td data-label="Facility">${p.facility}</td>
      <td data-label="Priority">${U.prio(p.priority)}</td>
      <td data-label="Engineer">${p.engineer ? U.avatar(p.engineer)+" "+`<span class="fs-13">${p.engineer.split(" ")[0]}</span>` : '<span class="dim">—</span>'}</td>
      <td data-label="Due"><span style="color:${overdue?'var(--danger)':'inherit'}">${U.fmtDate(p.due)}</span></td>
      <td data-label="Status">${U.stageBadge(p.stage)}</td>
      <td><div class="row-actions"><button class="btn btn-sm" data-pr="${p.id}">${I("eye",14)} View</button></div></td>
    </tr>`;
  }

  function mount(root, state) {
    root.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => { filter = b.dataset.filter; window.App.refresh(); });
  }

  // ============================================================
  //  NEW REQUEST FORM (modal)
  // ============================================================
  function openForm() {
    const facOpts = DB.FACILITIES.map(f => `<option value="${f.code}">${f.code} — ${f.name}</option>`).join("");
    const catOpts = ["HVAC","Electrical","Plumbing","Mechanical","Painting","Safety"].map(c=>`<option>${c}</option>`).join("");
    const body = `<form id="pr-form" novalidate>
      <div class="form-grid">
        <div class="field full">
          <label>Issue title <span class="req">*</span></label>
          <input class="input" name="title" placeholder="e.g. Chiller unit tripping intermittently" required>
          <div class="err-msg">Please enter a short title.</div>
        </div>
        <div class="field full">
          <label>Issue description <span class="req">*</span></label>
          <textarea class="textarea" name="desc" placeholder="Describe the fault, location detail, and any safety impact…" required></textarea>
          <div class="err-msg">Description is required.</div>
        </div>
        <div class="field">
          <label>Facility / Location <span class="req">*</span></label>
          <select class="select" name="facility" required>
            <option value="" disabled selected>Select facility…</option>${facOpts}
          </select>
          <div class="err-msg">Choose a facility.</div>
        </div>
        <div class="field">
          <label>Trade / Category <span class="req">*</span></label>
          <select class="select" name="cat" required>
            <option value="" disabled selected>Select category…</option>${catOpts}
          </select>
          <div class="err-msg">Choose a category.</div>
        </div>
        <div class="field full">
          <label>Priority <span class="req">*</span></label>
          <div class="seg">
            <label><input type="radio" name="priority" value="low"><span class="seg-low">Low</span></label>
            <label><input type="radio" name="priority" value="medium" checked><span class="seg-medium">Medium</span></label>
            <label><input type="radio" name="priority" value="high"><span class="seg-high">High</span></label>
          </div>
        </div>
        <div class="field">
          <label>Expected completion date</label>
          <input class="input" type="date" name="due" value="2026-06-05" min="2026-05-29">
          <div class="hint">SLA target auto-applies for High priority (48h).</div>
        </div>
        <div class="field">
          <label>Reported by</label>
          <input class="input" name="by" value="Maya Cordova" readonly style="opacity:.7">
        </div>
        <div class="field full">
          <label>Attachment</label>
          <div class="dropzone" id="dz">
            ${I("upload",26)}
            <div><b>Click to upload</b> or drag a photo / PDF here</div>
            <div class="fs-12 dim" style="margin-top:4px">PNG, JPG or PDF · up to 10MB</div>
            <input type="file" id="dz-input" hidden accept=".png,.jpg,.jpeg,.pdf">
          </div>
          <div id="dz-list"></div>
        </div>
        <div class="field full">
          <label>Remarks</label>
          <textarea class="textarea" name="remarks" placeholder="Optional notes for the Service Request Desk…" style="min-height:64px"></textarea>
        </div>
      </div>
    </form>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="pr-submit">${I("check",16)} Submit request</button>`;
    const m = U.modal({ title:"New Service Request", sub:"Raise a facility issue — it enters the workflow at “Submitted”.", body, foot, wide:true });

    // dropzone wiring
    const dz = m.querySelector("#dz"), input = m.querySelector("#dz-input"), dzList = m.querySelector("#dz-list");
    let fileName = "";
    dz.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) { fileName = input.files[0].name; renderFile(); } };
    ["dragover","dragenter"].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave","drop"].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", ev => { if (ev.dataTransfer.files[0]) { fileName = ev.dataTransfer.files[0].name; renderFile(); } });
    function renderFile() {
      dzList.innerHTML = fileName ? `<div class="file-chip">${I("paperclip",14)} ${U.esc(fileName)} <button type="button" id="rm-file">${I("x",13)}</button></div>` : "";
      const rm = dzList.querySelector("#rm-file"); if (rm) rm.onclick = () => { fileName=""; input.value=""; renderFile(); };
    }

    m.querySelector("#pr-submit").onclick = () => {
      const form = m.querySelector("#pr-form");
      const data = Object.fromEntries(new FormData(form));
      let valid = true;
      ["title","desc","facility","cat"].forEach(name => {
        const el = form.elements[name];
        const field = el.closest(".field");
        if (!el.value.trim()) { field.classList.add("invalid"); el.classList.add("err"); valid = false; }
        else { field.classList.remove("invalid"); el.classList.remove("err"); }
      });
      if (!valid) { U.toast({ title:"Check the form", body:"Some required fields are missing.", tone:"danger", icon:"alert" }); return; }
      // create
      const id = "PR-" + (2842 + DB.PR.filter(p=>p.id.startsWith("PR-28")).length);
      const rec = {
        id, title: data.title, cat: data.cat, facility: data.facility,
        priority: data.priority, stage: "Submitted", engineer: null,
        created: "2026-05-29", due: data.due || "2026-06-05",
        desc: data.desc, remarks: data.remarks || "", attach: fileName, cost: 0,
      };
      DB.PR.unshift(rec);
      U.closeModal();
      window.App.pushNotification({ icon:"ticket", tone:"primary", title:"New request submitted", body:`${id} · ${data.title}` });
      U.toast({ title:"Request submitted", body:`${id} entered the workflow at “Submitted”.`, tone:"ok", icon:"check" });
      window.App.go("requests");
    };
  }

  // ============================================================
  //  DETAIL + WORKFLOW
  // ============================================================
  function workflowHtml(stage) {
    const idx = DB.STAGES.indexOf(stage);
    const nums = ["1","2","3","4","5","6"];
    return `<div class="workflow">${DB.STAGES.map((s, i) => {
      const cls = i < idx ? "done" : i === idx ? "current" : "";
      const node = i < idx ? I("check",16) : nums[i];
      return `<div class="wf-step ${cls}"><div class="node">${node}</div><div class="lbl">${s}</div></div>`;
    }).join("")}</div>`;
  }

  // role -> available transition
  function nextAction(p, role) {
    const s = p.stage;
    if (role === "admin") {
      if (s === "Submitted") return { label:"Start review", to:"Review", tone:"primary" };
      if (s === "Review") return { label:"Assign engineer", to:"Assigned", assign:true, tone:"primary" };
    }
    if (role === "engineer") {
      if (s === "Assigned") return { label:"Accept & start", to:"Work In-Progress", tone:"primary" };
      if (s === "Work In-Progress") return { label:"Mark complete", to:"Completion Review", tone:"ok" };
    }
    if (role === "manager") {
      if (s === "Completion Review") return { label:"Approve & close", to:"Closed", tone:"ok" };
      if (s === "Submitted") return { label:"Start review", to:"Review", tone:"primary" };
      if (s === "Review") return { label:"Assign engineer", to:"Assigned", assign:true, tone:"primary" };
    }
    return null;
  }

  function openDetail(id) {
    const p = DB.PR.find(x => x.id === id);
    if (!p) return;
    const role = window.App.state.role;
    const action = nextAction(p, role);
    const overdue = p.stage !== "Closed" && U.daysFromToday(p.due) < 0;

    const body = `
      <div style="margin-bottom:22px">${workflowHtml(p.stage)}</div>
      <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <span class="mono dim">${p.id}</span>${U.catBadge(p.cat)}${U.prio(p.priority)}${U.stageBadge(p.stage)}
        ${overdue?`<span class="badge b-danger">${I("clock",13)} Overdue</span>`:""}
      </div>
      <h2 style="font-family:var(--font-display);font-size:19px;margin-bottom:6px">${U.esc(p.title)}</h2>
      <p class="muted" style="line-height:1.55">${U.esc(p.desc)}</p>

      <div class="grid cols-2 mt-24" style="gap:24px">
        <div>
          <div class="card-section-title">Details</div>
          <div class="kv"><span class="k">Facility</span><span class="v">${DB.facilityName(p.facility)}</span></div>
          <div class="kv"><span class="k">Reported</span><span class="v">${U.fmtDate(p.created)}</span></div>
          <div class="kv"><span class="k">Target completion</span><span class="v">${U.fmtDate(p.due)}</span></div>
          <div class="kv"><span class="k">Assigned engineer</span><span class="v">${p.engineer ? p.engineer : "Unassigned"}</span></div>
          ${p.cost ? `<div class="kv"><span class="k">Recorded cost</span><span class="v mono">$${p.cost.toLocaleString()}</span></div>`:""}
        </div>
        <div>
          <div class="card-section-title">Attachment & remarks</div>
          ${p.attach ? `<div class="file-chip" style="margin-bottom:12px">${I("file",14)} ${U.esc(p.attach)}</div>` : `<p class="dim fs-13" style="margin-bottom:12px">No attachment.</p>`}
          <p class="fs-13 muted" style="line-height:1.5">${p.remarks ? U.esc(p.remarks) : '<span class="dim">No remarks yet.</span>'}</p>
        </div>
      </div>`;

    let foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Close</button>`;
    if (action) {
      foot += `<button class="btn btn-${action.tone}" id="advance">${I("arrowRight",16)} ${action.label}</button>`;
    } else if (p.stage === "Closed") {
      foot += `<span class="badge b-ok" style="align-self:center">${I("check",13)} Resolved & verified</span>`;
    } else {
      foot += `<span class="dim fs-12" style="align-self:center">No action for your role at this stage</span>`;
    }

    const m = U.modal({ title:"Request detail", sub:`Workflow · ${p.stage}`, body, foot, wide:true });

    const adv = m.querySelector("#advance");
    if (adv) adv.onclick = () => {
      if (action.assign) { openAssign(p); return; }
      advance(p, action.to);
      U.closeModal();
    };
  }

  function openAssign(p) {
    const opts = DB.ENGINEERS.map(e => `<option>${e}</option>`).join("");
    const body = `<div class="field">
      <label>Assign to engineer <span class="req">*</span></label>
      <select class="select" id="eng-sel">${opts}</select>
      <div class="hint mt-8">The engineer is notified and can accept the job from their dashboard.</div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="confirm-assign">${I("check",16)} Assign & advance</button>`;
    const m = U.modal({ title:`Assign ${p.id}`, sub:p.title, body, foot });
    m.querySelector("#confirm-assign").onclick = () => {
      p.engineer = m.querySelector("#eng-sel").value;
      advance(p, "Assigned");
      U.closeModal();
    };
  }

  // state machine
  function advance(p, to) {
    const from = p.stage;
    p.stage = to;
    const msgs = {
      "Review": "moved to Review by the Service Desk",
      "Assigned": `assigned to ${p.engineer}`,
      "Work In-Progress": "accepted — work started",
      "Completion Review": "marked complete, awaiting manager sign-off",
      "Closed": "approved and closed",
    };
    window.App.pushNotification({ icon:"refresh", tone:U.PR_STAGE_TONE[to], title:`${p.id} status updated`, body:`${from} → ${to}` });
    U.toast({ title:`${p.id} ${to === "Closed" ? "closed" : "updated"}`, body:`${p.title} — ${msgs[to]||to}.`, tone: to==="Closed"?"ok":"primary", icon: to==="Closed"?"check":"refresh" });
    window.App.refresh();
  }

  window.Views = window.Views || {};
  window.Views.requests = { render, mount, openForm, openDetail };
})();
