/* ============================================================
   FMS — Mock data layer (acts as in-memory "database")
   ============================================================ */
(function () {
  // ---- Facilities (assumed full names; user can correct) ----
  const FACILITIES = [
    { code: "RL-DWC", name: "RetailLogis · DWC (Dubai South)" },
    { code: "RLN",    name: "RetailLogis North · Hub" },
    { code: "SSF",    name: "Sharjah Sorting Facility" },
    { code: "RL-JA",  name: "RetailLogis · Jebel Ali" },
    { code: "RL-AUH", name: "RetailLogis · Abu Dhabi DC" },
    { code: "RL-AIN", name: "RetailLogis · Al Ain Spoke" },
  ];

  // ---- Roles ----
  const ROLES = [
    { id: "requester", name: "Maya Cordova",   title: "Requester · Ops Floor",        color: "#6E72F4", initials: "MC" },
    { id: "admin",     name: "Daniel Reyes",   title: "Service Request Desk",          color: "#F26B3A", initials: "DR" },
    { id: "engineer",  name: "Faisal Karim",   title: "Maintenance Engineer",          color: "#35D49A", initials: "FK" },
    { id: "manager",   name: "Priya Nair",     title: "Works Manager",                 color: "#45A9FB", initials: "PN" },
    { id: "finance",   name: "Hannah Whitlock", title: "Finance · FM Budget",          color: "#F5B53D", initials: "HW" },
  ];

  const ENGINEERS = ["Faisal Karim", "Omar Haddad", "Lena Fischer", "Raj Menon"];

  // Workflow stages in order
  const STAGES = ["Submitted", "Review", "Assigned", "Work In-Progress", "Completion Review", "Closed"];

  // ---- Service Requests ----
  const PR = [
    { id:"PR-2841", title:"Chiller unit tripping intermittently", cat:"HVAC", facility:"RL-DWC", priority:"high", stage:"Work In-Progress", engineer:"Faisal Karim", created:"2026-05-24", due:"2026-05-30", desc:"Cold aisle chiller CH-02 trips every 3-4 hours, throwing high-pressure fault. Ambient store temp climbing above SLA.", remarks:"Spares for compressor relay reserved.", attach:"fault-log-ch02.pdf", cost:4200 },
    { id:"PR-2840", title:"Dock leveler hydraulic leak — Bay 6", cat:"Mechanical", facility:"RLN", priority:"high", stage:"Assigned", engineer:"Omar Haddad", created:"2026-05-25", due:"2026-05-29", desc:"Visible hydraulic fluid pooling under dock leveler at Bay 6. Leveler slow to rise.", remarks:"", attach:"", cost:0 },
    { id:"PR-2839", title:"LED high-bay outage in Zone C", cat:"Electrical", facility:"SSF", priority:"medium", stage:"Review", engineer:null, created:"2026-05-26", due:"2026-06-02", desc:"Row of 6 high-bay fixtures out across Zone C picking aisles. Reduced lux affecting scanning accuracy.", remarks:"", attach:"zone-c-layout.png", cost:0 },
    { id:"PR-2838", title:"Restroom block — low water pressure", cat:"Plumbing", facility:"RL-JA", priority:"low", stage:"Completion Review", engineer:"Lena Fischer", created:"2026-05-20", due:"2026-05-28", desc:"Ground floor restroom taps trickling. Suspected booster pump or aerator scaling.", remarks:"Booster pump impeller replaced, awaiting sign-off.", attach:"", cost:680 },
    { id:"PR-2837", title:"Repaint damaged safety walkway lines", cat:"Painting", facility:"RL-DWC", priority:"low", stage:"Closed", engineer:"Raj Menon", created:"2026-05-12", due:"2026-05-22", desc:"Pedestrian walkway markings worn near MHE charging area, safety audit flag.", remarks:"Completed with anti-slip epoxy. Audit closed.", attach:"", cost:1150 },
    { id:"PR-2836", title:"Fire panel showing zone fault", cat:"Safety", facility:"RL-AUH", priority:"high", stage:"Submitted", engineer:null, created:"2026-05-28", due:"2026-05-29", desc:"Addressable fire panel reporting open-circuit fault on detection loop 3.", remarks:"", attach:"panel-fault.jpg", cost:0 },
    { id:"PR-2835", title:"Office AC not cooling — Admin mezz", cat:"HVAC", facility:"RLN", priority:"medium", stage:"Closed", engineer:"Faisal Karim", created:"2026-05-08", due:"2026-05-16", desc:"Split AC in admin mezzanine blowing warm air. Suspected gas recharge.", remarks:"Regassed R410a, leak test passed.", attach:"", cost:540 },
    { id:"PR-2834", title:"Roller shutter motor — Gate 2 stuck", cat:"Mechanical", facility:"RL-AIN", priority:"medium", stage:"Work In-Progress", engineer:"Omar Haddad", created:"2026-05-22", due:"2026-05-31", desc:"Gate 2 roller shutter stops halfway, limit switch suspected.", remarks:"", attach:"", cost:0 },
    { id:"PR-2833", title:"Battery wash bay drain blocked", cat:"Plumbing", facility:"RL-DWC", priority:"medium", stage:"Assigned", engineer:"Lena Fischer", created:"2026-05-27", due:"2026-06-01", desc:"MHE battery wash bay drain backing up, risk of acidic runoff.", remarks:"", attach:"", cost:0 },
    { id:"PR-2832", title:"Emergency exit sign flickering", cat:"Electrical", facility:"SSF", priority:"low", stage:"Closed", engineer:"Raj Menon", created:"2026-05-05", due:"2026-05-12", desc:"Exit sign near Gate 4 flickering, battery backup likely failing.", remarks:"Battery pack swapped.", attach:"", cost:210 },
  ];

  // ---- MHE Assets ----
  const MHE = [
    { id:"FL-014", type:"Forklift · 2.5T Diesel", make:"Toyota 8FD25", facility:"RL-DWC", status:"operational", hours:182, target:200, util:91, lastService:"2026-04-18", health:96 },
    { id:"RT-006", type:"Reach Truck", make:"Crown ESR5260", facility:"RLN", status:"operational", hours:168, target:200, util:84, lastService:"2026-05-02", health:88 },
    { id:"FL-021", type:"Forklift · 3T Electric", make:"Linde E30", facility:"SSF", status:"breakdown", hours:54, target:200, util:27, lastService:"2026-03-30", health:41 },
    { id:"PJ-033", type:"Powered Pallet Jack", make:"Jungheinrich EJE", facility:"RL-JA", status:"operational", hours:144, target:180, util:80, lastService:"2026-05-10", health:90 },
    { id:"OP-009", type:"Order Picker", make:"Crown SP3500", facility:"RL-DWC", status:"inactive", hours:0, target:160, util:0, lastService:"2026-02-14", health:72 },
    { id:"TT-002", type:"Tow Tractor", make:"Toyota CBT4", facility:"RL-AUH", status:"operational", hours:121, target:160, util:76, lastService:"2026-05-15", health:85 },
    { id:"SL-001", type:"Scissor Lift", make:"Genie GS-2632", facility:"RLN", status:"breakdown", hours:38, target:120, util:32, lastService:"2026-04-01", health:48 },
    { id:"FL-018", type:"Forklift · 2T Electric", make:"Hyster J2.0XN", facility:"RL-AIN", status:"operational", hours:159, target:200, util:80, lastService:"2026-05-06", health:93 },
    { id:"RT-011", type:"Reach Truck", make:"Yale MR16", facility:"SSF", status:"operational", hours:173, target:200, util:87, lastService:"2026-04-28", health:81 },
    { id:"PJ-040", type:"Powered Pallet Jack", make:"BT Levio", facility:"RL-JA", status:"inactive", hours:12, target:180, util:7, lastService:"2026-03-22", health:64 },
  ];

  // ---- Transfer history ----
  const TRANSFERS = [
    { asset:"FL-014", from:"RLN", to:"RL-DWC", date:"2026-05-21 09:14", by:"D. Reyes", reason:"Peak inbound support" },
    { asset:"OP-009", from:"RL-DWC", to:"Workshop", date:"2026-05-18 16:40", by:"F. Karim", reason:"Scheduled overhaul" },
    { asset:"TT-002", from:"RL-JA", to:"RL-AUH", date:"2026-05-15 11:02", by:"P. Nair", reason:"Cross-dock rebalance" },
    { asset:"FL-021", from:"SSF", to:"Workshop", date:"2026-05-12 08:25", by:"O. Haddad", reason:"Breakdown — traction fault" },
    { asset:"RT-011", from:"RL-AUH", to:"SSF", date:"2026-05-09 13:55", by:"D. Reyes", reason:"Capacity shift" },
    { asset:"PJ-040", from:"RLN", to:"RL-JA", date:"2026-05-04 10:30", by:"P. Nair", reason:"Volume drop at RLN" },
  ];

  // ---- PPM tasks ----
  const PPM = [
    { id:"PPM-501", asset:"Chiller CH-01 · RL-DWC", type:"HVAC", freq:"Quarterly", last:"2026-03-05", next:"2026-06-05", owner:"Faisal Karim", status:"due-soon" },
    { id:"PPM-502", asset:"DG Set 500kVA · RLN", type:"Generator", freq:"Monthly", last:"2026-05-02", next:"2026-06-02", owner:"Omar Haddad", status:"due-soon" },
    { id:"PPM-503", asset:"Fire Pump · SSF", type:"Fire Safety", freq:"Half-Yearly", last:"2025-12-10", next:"2026-06-10", owner:"Lena Fischer", status:"upcoming" },
    { id:"PPM-504", asset:"AHU Bank · RL-JA", type:"HVAC", freq:"Quarterly", last:"2026-02-20", next:"2026-05-20", owner:"Faisal Karim", status:"overdue" },
    { id:"PPM-505", asset:"Solar Array Inverters · RL-DWC", type:"Electrical", freq:"Quarterly", last:"2026-03-15", next:"2026-06-15", owner:"Raj Menon", status:"upcoming" },
    { id:"PPM-506", asset:"Dock Levelers (x8) · RLN", type:"Mechanical", freq:"Half-Yearly", last:"2026-01-08", next:"2026-07-08", owner:"Omar Haddad", status:"upcoming" },
    { id:"PPM-507", asset:"LV Panel Thermography · RL-AUH", type:"Electrical", freq:"Quarterly", last:"2026-02-28", next:"2026-05-28", owner:"Raj Menon", status:"overdue" },
    { id:"PPM-508", asset:"Sprinkler Inspection · RL-AIN", type:"Fire Safety", freq:"Quarterly", last:"2026-03-01", next:"2026-06-01", owner:"Lena Fischer", status:"due-soon" },
  ];

  // ---- Inventory (MEP spares) ----
  const INVENTORY = [
    { id:"EL-1102", name:"Contactor 40A 3-pole", cat:"Electrical", facility:"RL-DWC", qty:14, min:6, unit:"pcs", loc:"Rack A2" },
    { id:"EL-1108", name:"MCB 32A Type C", cat:"Electrical", facility:"RLN", qty:3, min:10, unit:"pcs", loc:"Rack A4" },
    { id:"EL-1120", name:"LED High-bay Driver 150W", cat:"Electrical", facility:"SSF", qty:9, min:8, unit:"pcs", loc:"Rack B1" },
    { id:"PL-2201", name:"Booster Pump Impeller", cat:"Plumbing", facility:"RL-JA", qty:2, min:2, unit:"pcs", loc:"Rack C3" },
    { id:"PL-2210", name:"PPR Pipe 32mm", cat:"Plumbing", facility:"RL-DWC", qty:46, min:20, unit:"m", loc:"Rack C1" },
    { id:"PL-2215", name:"Float Valve Assembly", cat:"Plumbing", facility:"RLN", qty:1, min:4, unit:"pcs", loc:"Rack C2" },
    { id:"PT-3301", name:"Epoxy Floor Paint — Safety Yellow", cat:"Painting", facility:"RL-DWC", qty:5, min:6, unit:"L", loc:"Rack D1" },
    { id:"PT-3305", name:"Anti-slip Aggregate", cat:"Painting", facility:"SSF", qty:18, min:5, unit:"kg", loc:"Rack D2" },
    { id:"HV-4401", name:"R410a Refrigerant", cat:"HVAC", facility:"RLN", qty:4, min:3, unit:"cyl", loc:"Rack E1" },
    { id:"HV-4408", name:"AHU Belt B-52", cat:"HVAC", facility:"RL-JA", qty:2, min:6, unit:"pcs", loc:"Rack E2" },
    { id:"HV-4412", name:"Air Filter 24x24 G4", cat:"HVAC", facility:"RL-DWC", qty:32, min:12, unit:"pcs", loc:"Rack E3" },
    { id:"MC-5501", name:"Hydraulic Oil ISO 46", cat:"Mechanical", facility:"RLN", qty:7, min:4, unit:"L", loc:"Rack F1" },
    { id:"MC-5510", name:"Dock Leveler Lip Spring", cat:"Mechanical", facility:"RL-AUH", qty:1, min:3, unit:"pcs", loc:"Rack F2" },
    { id:"SF-6601", name:"Fire Detector — Optical", cat:"Safety", facility:"RL-AUH", qty:11, min:5, unit:"pcs", loc:"Rack G1" },
    { id:"SF-6605", name:"Emergency Light Battery Pack", cat:"Safety", facility:"SSF", qty:4, min:8, unit:"pcs", loc:"Rack G2" },
  ];

  const INV_CATS = ["Electrical", "Plumbing", "Painting", "HVAC", "Mechanical", "Safety"];

  // ---- Solar log readings (last 7 days, kWh) ----
  const SOLAR = [
    { date:"May 23", kwh: 842, irr: 6.1 }, { date:"May 24", kwh: 905, irr: 6.6 },
    { date:"May 25", kwh: 788, irr: 5.7 }, { date:"May 26", kwh: 931, irr: 6.8 },
    { date:"May 27", kwh: 876, irr: 6.3 }, { date:"May 28", kwh: 958, irr: 7.0 },
    { date:"May 29", kwh: 612, irr: 4.4 },
  ];

  // ---- Equipment health log entries ----
  const HEALTHLOG = [
    { time:"06:00", equip:"DG Set 500kVA", temp:"72°C", press:"3.2 bar", status:"ok", by:"F. Karim" },
    { time:"06:00", equip:"Chiller CH-01", temp:"7.4°C", press:"High OK", status:"ok", by:"F. Karim" },
    { time:"06:00", equip:"Booster Pump P-2", temp:"48°C", press:"2.1 bar", status:"warn", by:"L. Fischer" },
    { time:"06:00", equip:"Solar Inverter INV-3", temp:"39°C", press:"—", status:"ok", by:"R. Menon" },
    { time:"06:00", equip:"Fire Pump FP-1", temp:"31°C", press:"5.0 bar", status:"ok", by:"L. Fischer" },
  ];

  // ---- Notifications ----
  const NOTIS = [
    { id:1, icon:"refresh", tone:"info",   title:"PR-2841 status updated", body:"Moved to Work In-Progress by F. Karim", time:"8 min ago", unread:true },
    { id:2, icon:"alert",   tone:"danger", title:"Low stock alert", body:"MCB 32A Type C below minimum at RLN (3/10)", time:"34 min ago", unread:true },
    { id:3, icon:"calendar",tone:"warn",   title:"PPM overdue", body:"AHU Bank · RL-JA service is 9 days overdue", time:"1 hr ago", unread:true },
    { id:4, icon:"ticket",  tone:"primary",title:"New request submitted", body:"PR-2836 · Fire panel zone fault · RL-AUH", time:"2 hr ago", unread:false },
    { id:5, icon:"forklift",tone:"danger", title:"MHE breakdown", body:"FL-021 reported breakdown at SSF", time:"5 hr ago", unread:false },
  ];

  window.DB = {
    FACILITIES, ROLES, ENGINEERS, STAGES, PR, MHE, TRANSFERS, PPM,
    INVENTORY, INV_CATS, SOLAR, HEALTHLOG, NOTIS,
    facilityName(code){ const f = FACILITIES.find(x=>x.code===code); return f?f.name:code; },
  };
})();
