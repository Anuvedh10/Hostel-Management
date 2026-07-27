const API = "/api";

// ---------- State ----------
let state = {
  token: localStorage.getItem("shms_token") || null,
  role: localStorage.getItem("shms_role") || null,
  fullName: localStorage.getItem("shms_name") || null,
  page: "dashboard",
  blocksCache: null,
};

// ---------- API helper ----------
async function api(path, { method = "GET", body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

function toast(msg, kind = "") {
  const el = document.getElementById("toast");
  el.classList.add("hidden");
  void el.offsetWidth; // force reflow so the entrance animation replays every time
  el.textContent = msg;
  el.className = `toast ${kind}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 3200);
}

// ---------- View switching ----------
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("app-shell").classList.add("hidden");
  if (id === "app") {
    document.getElementById("app-shell").classList.remove("hidden");
  } else {
    document.getElementById(id).classList.remove("hidden");
  }
}

function logout() {
  localStorage.removeItem("shms_token");
  localStorage.removeItem("shms_role");
  localStorage.removeItem("shms_name");
  state = { token: null, role: null, fullName: null, page: "dashboard", blocksCache: null };
  showView("view-login");
}

// ---------- Login ----------
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  const submitBtn = e.target.querySelector("button[type=submit]");
  const originalLabel = submitBtn.innerHTML;
  errEl.textContent = "";
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Signing in…`;
  try {
    const data = await api("/auth/login", { method: "POST", body: { username, password } });
    state.token = data.access_token;
    state.role = data.role;
    state.fullName = data.full_name;
    localStorage.setItem("shms_token", state.token);
    localStorage.setItem("shms_role", state.role);
    localStorage.setItem("shms_name", state.fullName);
    enterApp();
  } catch (err) {
    errEl.textContent = err.message;
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;
  }
});

document.querySelectorAll(".demo-chip").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("login-username").value = btn.dataset.user;
    document.getElementById("login-password").value = btn.dataset.pass;
  });
});

document.getElementById("logout-btn").addEventListener("click", logout);

// ---------- Nav icons ----------
// Simple 1.5px-stroke line icons (24x24 viewBox) — one per section, chosen for what it represents.
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.4-3.8 4.3-5.7 7.5-5.7s6.1 1.9 7.5 5.7"/></svg>`,
  fees: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/></svg>`,
  students: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3 20c.9-3.4 3-5.2 5.5-5.2S13 16.6 14 20"/><path d="M14.5 20c.7-2.6 2.1-4 4-4 1.6 0 2.9.9 3.7 2.6"/></svg>`,
  rooms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V7.5L12 3l8 4.5V21"/><path d="M9 21v-6h6v6"/></svg>`,
  blocks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V9l4-3 4 3v12"/><path d="M13 21V6l3-2 3 2v15"/><path d="M9 21h11"/></svg>`,
  account: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2.06 2.06 0 1 1-2.92 2.92l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.17a2.06 2.06 0 1 1-4.12 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2.06 2.06 0 1 1-2.92-2.92l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H2a2.06 2.06 0 1 1 0-4.12h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.06 2.06 0 1 1 2.92-2.92l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V2a2.06 2.06 0 1 1 4.12 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2.06 2.06 0 1 1 2.92 2.92l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H22a2.06 2.06 0 1 1 0 4.12h-.09a1.7 1.7 0 0 0-1.56 1.03z"/></svg>`,
};

// ---------- Nav config per role ----------
const NAV = {
  student: [
    { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { id: "profile", label: "My Profile", icon: ICONS.profile },
    { id: "fees", label: "My Fees", icon: ICONS.fees },
    { id: "account", label: "Account", icon: ICONS.account },
  ],
  warden: [
    { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { id: "students", label: "Students", icon: ICONS.students },
    { id: "rooms", label: "Rooms", icon: ICONS.rooms },
    { id: "fees", label: "Fees", icon: ICONS.fees },
    { id: "account", label: "Account", icon: ICONS.account },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { id: "students", label: "Students", icon: ICONS.students },
    { id: "rooms", label: "Rooms", icon: ICONS.rooms },
    { id: "fees", label: "Fees", icon: ICONS.fees },
    { id: "blocks", label: "Blocks", icon: ICONS.blocks },
    { id: "account", label: "Account", icon: ICONS.account },
  ],
};

const PAGE_TITLES = {
  dashboard: "Dashboard", profile: "My Profile", fees: "Fees",
  students: "Students", rooms: "Rooms", blocks: "Hostel Blocks",
  account: "Account Settings",
};

function buildNav() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = "";
  (NAV[state.role] || []).forEach(item => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (state.page === item.id ? " active" : "");
    btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
    btn.addEventListener("click", () => navigate(item.id));
    nav.appendChild(btn);
  });
}

function navigate(page) {
  state.page = page;
  document.getElementById("page-title").textContent = PAGE_TITLES[page] || page;
  buildNav();
  renderPage();
}

function enterApp() {
  document.getElementById("who-name").textContent = state.fullName;
  document.getElementById("who-role").textContent = state.role;
  showView("app");
  navigate("dashboard");
  tickClock();
}

function tickClock() {
  const el = document.getElementById("topbar-clock");
  const fmt = () => new Date().toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
  el.textContent = fmt();
  clearInterval(window._clockInt);
  window._clockInt = setInterval(() => el.textContent = fmt(), 30000);
}

const content = () => document.getElementById("main-content");

async function renderPage() {
  content().innerHTML = `<div class="loading-state"><span class="spinner spinner-dark"></span>Loading…</div>`;
  try {
    if (state.page === "dashboard") {
      if (state.role === "student") await renderStudentDashboard();
      else if (state.role === "warden") await renderWardenDashboard();
      else await renderAdminDashboard();
    } else if (state.page === "profile") {
      await renderProfile();
    } else if (state.page === "fees") {
      await renderFees();
    } else if (state.page === "students") {
      await renderStudents();
    } else if (state.page === "rooms") {
      await renderRooms();
    } else if (state.page === "blocks") {
      await renderBlocks();
    } else if (state.page === "account") {
      await renderAccount();
    }
  } catch (err) {
    content().innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

// ---------- Student Dashboard ----------
async function renderStudentDashboard() {
  const d = await api("/dashboard/student");
  const room = d.room
    ? `${d.room.block} · Floor ${d.room.floor} · Room ${d.room.room_number} (${d.room.occupancy}/${d.room.capacity})`
    : "Not yet allocated";
  content().innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card"><p class="stat-label">Register No.</p><p class="stat-value mono" style="font-size:20px">${d.register_number}</p></div>
      <div class="stat-card accent-brass"><p class="stat-label">Fee Due</p><p class="stat-value">₹${d.total_fee_due.toLocaleString("en-IN")}</p></div>
      <div class="stat-card accent-teal"><p class="stat-label">Room</p><p class="stat-sub" style="margin-top:8px">${room}</p></div>
      <div class="stat-card"><p class="stat-label">Pending Fee Items</p><p class="stat-value">${d.pending_fees}</p></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Welcome, ${d.full_name.split(" ")[0]}</h2></div>
      <p class="panel-sub">Use the sidebar to view your full profile or fee history and receipts.</p>
    </div>
  `;
}

// ---------- Warden Dashboard ----------
async function renderWardenDashboard() {
  const d = await api("/dashboard/warden");
  const rows = Object.entries(d.occupancy_by_block).map(([name, o]) => {
    const pct = o.capacity ? Math.round((o.occupied / o.capacity) * 100) : 0;
    return `<div class="chart-bar-row">
      <span class="chart-bar-label">${name}</span>
      <span class="chart-bar-track"><span class="chart-bar-fill" style="width:${pct}%"></span></span>
      <span class="chart-bar-val">${o.occupied}/${o.capacity}</span>
    </div>`;
  }).join("") || `<p class="empty-state">No rooms configured yet.</p>`;

  content().innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card"><p class="stat-label">Total Students</p><p class="stat-value">${d.total_students}</p></div>
      <div class="stat-card accent-teal"><p class="stat-label">Occupied Beds</p><p class="stat-value">${d.occupied_beds}/${d.total_capacity}</p></div>
      <div class="stat-card"><p class="stat-label">Total Rooms</p><p class="stat-value">${d.total_rooms}</p></div>
      <div class="stat-card accent-rust"><p class="stat-label">Pending Fee Students</p><p class="stat-value">${d.students_with_pending_fees}</p></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Occupancy by Block</h2></div>
      ${rows}
    </div>
  `;
}

// ---------- Admin Dashboard ----------
async function renderAdminDashboard() {
  const d = await api("/dashboard/admin");
  const feeRows = Object.entries(d.revenue_by_fee_type).map(([type, amt]) => {
    const max = Math.max(...Object.values(d.revenue_by_fee_type), 1);
    const pct = Math.round((amt / max) * 100);
    return `<div class="chart-bar-row">
      <span class="chart-bar-label" style="text-transform:capitalize">${type}</span>
      <span class="chart-bar-track"><span class="chart-bar-fill" style="width:${pct}%"></span></span>
      <span class="chart-bar-val">₹${amt.toLocaleString("en-IN")}</span>
    </div>`;
  }).join("") || `<p class="empty-state">No fee records yet.</p>`;

  content().innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card"><p class="stat-label">Students</p><p class="stat-value">${d.total_students}</p></div>
      <div class="stat-card"><p class="stat-label">Wardens</p><p class="stat-value">${d.total_wardens}</p></div>
      <div class="stat-card accent-teal"><p class="stat-label">Occupancy</p><p class="stat-value">${d.occupancy_rate}%</p><p class="stat-sub">${d.occupied_beds}/${d.total_capacity} beds</p></div>
      <div class="stat-card accent-brass"><p class="stat-label">Revenue Collected</p><p class="stat-value" style="font-size:24px">₹${d.total_revenue.toLocaleString("en-IN")}</p></div>
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <div class="panel" style="margin-top:0">
        <div class="panel-head"><h2>Revenue by Fee Type</h2></div>
        ${feeRows}
      </div>
      <div class="panel" style="margin-top:0">
        <div class="panel-head"><h2>Outstanding Dues</h2></div>
        <p class="stat-value accent-rust" style="color:var(--rust)">₹${d.outstanding_dues.toLocaleString("en-IN")}</p>
        <p class="panel-sub">Total billed minus collected across all students.</p>
      </div>
    </div>
  `;
}

// ---------- Student: My Profile ----------
async function renderProfile() {
  const s = await api("/students/me");
  content().innerHTML = `
    <div class="panel" style="margin-top:0">
      <div class="panel-head"><h2>${s.full_name}</h2></div>
      <div class="grid grid-3" style="margin-bottom:18px">
        <div><p class="stat-label">Register No.</p><p class="mono">${s.register_number}</p></div>
        <div><p class="stat-label">Department</p><p>${s.department || "—"}</p></div>
        <div><p class="stat-label">Sem</p><p>${s.year || "—"}</p></div>
      </div>
      <form id="profile-form" class="form-row" style="align-items:flex-start">
        <label style="flex:1 1 220px">Phone<input type="text" id="p-phone" value="${s.phone || ""}"></label>
        <label style="flex:1 1 220px">Blood Group<input type="text" id="p-blood" value="${s.blood_group || ""}"></label>
        <label style="flex:1 1 220px">Emergency Contact<input type="text" id="p-emg" value="${s.emergency_contact || ""}"></label>
        <label style="flex:1 1 220px">Parent Name<input type="text" id="p-pname" value="${s.parent_name || ""}"></label>
        <label style="flex:1 1 220px">Parent Phone<input type="text" id="p-pphone" value="${s.parent_phone || ""}"></label>
        <label style="flex:2 1 320px">Address<input type="text" id="p-addr" value="${s.address || ""}"></label>
        <button class="btn btn-brass" type="submit">Save changes</button>
      </form>
    </div>
  `;
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/students/me", { method: "PUT", body: {
        phone: document.getElementById("p-phone").value,
        blood_group: document.getElementById("p-blood").value,
        emergency_contact: document.getElementById("p-emg").value,
        parent_name: document.getElementById("p-pname").value,
        parent_phone: document.getElementById("p-pphone").value,
        address: document.getElementById("p-addr").value,
      }});
      toast("Profile updated", "success");
    } catch (err) { toast(err.message, "error"); }
  });
}

// ---------- Account (all roles: change own username/password) ----------
async function renderAccount() {
  const me = await api("/auth/me");
  content().innerHTML = `
    <div class="panel" style="margin-top:0; max-width:480px">
      <div class="panel-head"><h2>Login Details</h2></div>
      <p class="panel-sub" style="margin-bottom:16px">Current username: <span class="mono">${me.username}</span></p>
      <form id="account-form" class="login-form">
        <label>Full name
          <input type="text" id="acc-fullname" value="${me.full_name}">
        </label>
        <label>Current password
          <input type="password" id="acc-current" required>
        </label>
        <label>New username <span style="text-transform:none;font-weight:400">(leave blank to keep)</span>
          <input type="text" id="acc-username" placeholder="${me.username}">
        </label>
        <label>New password <span style="text-transform:none;font-weight:400">(leave blank to keep)</span>
          <input type="password" id="acc-password">
        </label>
        <button class="btn btn-brass" type="submit">Save changes</button>
      </form>
      <p class="login-error" id="account-error"></p>
    </div>
  `;
  document.getElementById("account-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("account-error");
    errEl.textContent = "";
    const newUsername = document.getElementById("acc-username").value.trim();
    const newPassword = document.getElementById("acc-password").value;
    const newFullName = document.getElementById("acc-fullname").value.trim();
    try {
      await api("/auth/me/credentials", { method: "PUT", body: {
        current_password: document.getElementById("acc-current").value,
        new_username: newUsername || null,
        new_password: newPassword || null,
        new_full_name: (newFullName && newFullName !== me.full_name) ? newFullName : null,
      }});
      toast("Login details updated", "success");
      if (newFullName && newFullName !== me.full_name) {
        state.fullName = newFullName;
        localStorage.setItem("shms_name", newFullName);
        document.getElementById("who-name").textContent = newFullName;
      }
      renderAccount();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

// ---------- Fees (shared: student sees own, warden/admin see all + can record payments) ----------
async function renderFees() {
  const fees = await api("/fees");
  const isStaff = state.role !== "student";

  let studentOptions = "";
  if (isStaff) {
    const students = await api("/students");
    studentOptions = students.map(s => `<option value="${s.id}">${s.full_name} (${s.register_number})</option>`).join("");
  }

  const rows = fees.map(f => `
    <tr>
      <td class="mono">#${f.id}</td>
      ${isStaff ? `<td class="mono">${f.register_number || "—"}</td>` : ""}
      <td style="text-transform:capitalize">${f.fee_type}</td>
      <td>₹${f.amount.toLocaleString("en-IN")}</td>
      <td>₹${f.amount_paid.toLocaleString("en-IN")}</td>
      <td>₹${f.due_amount.toLocaleString("en-IN")}</td>
      <td>${f.due_date}</td>
      <td><span class="tag tag-${f.status}">${f.status}</span></td>
      ${isStaff ? `<td>${f.due_amount > 0 ? `<button class="btn btn-outline btn-sm" data-payfee="${f.id}" data-due="${f.due_amount}">Record payment</button>` : "—"}</td>` : `<td>${f.amount_paid > 0 ? `<button class="btn btn-outline btn-sm" data-receipt="${f.id}">Receipts</button>` : "—"}</td>`}
    </tr>
  `).join("") || `<tr><td colspan="9"><p class="empty-state">No fee records found.</p></td></tr>`;

  content().innerHTML = `
    ${isStaff ? `
    <div class="panel" style="margin-top:0">
      <div class="panel-head"><h2>Create Fee Record</h2></div>
      <form id="fee-form" class="form-row">
        <label style="flex:1 1 220px">Student<select id="f-student">${studentOptions}</select></label>
        <label>Fee Type
          <select id="f-type">
            <option value="admission">Admission</option>
            <option value="hostel">Hostel</option>
            <option value="mess">Mess</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Amount (₹)<input type="number" id="f-amount" min="1" required></label>
        <label>Due Date<input type="date" id="f-due" required></label>
        <button class="btn btn-brass" type="submit">Add fee</button>
      </form>
    </div>` : ""}
    <div class="panel">
      <div class="panel-head"><h2>${isStaff ? "All Fee Records" : "My Fees"}</h2></div>
      <table>
        <thead><tr>
          <th>ID</th>${isStaff ? "<th>Reg. No.</th>" : ""}<th>Type</th><th>Amount</th><th>Paid</th><th>Due</th><th>Due Date</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  if (isStaff) {
    document.getElementById("fee-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/fees", { method: "POST", body: {
          student_id: Number(document.getElementById("f-student").value),
          fee_type: document.getElementById("f-type").value,
          amount: Number(document.getElementById("f-amount").value),
          due_date: document.getElementById("f-due").value,
        }});
        toast("Fee record created", "success");
        renderFees();
      } catch (err) { toast(err.message, "error"); }
    });

    content().querySelectorAll("[data-payfee]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const due = Number(btn.dataset.due);
        const amt = prompt(`Amount to record (due: ₹${due}):`, due);
        if (!amt) return;
        try {
          await api("/fees/pay", { method: "POST", body: {
            fee_id: Number(btn.dataset.payfee), amount_paid: Number(amt), method: "cash",
          }});
          toast("Payment recorded", "success");
          renderFees();
        } catch (err) { toast(err.message, "error"); }
      });
    });
  } else {
    content().querySelectorAll("[data-receipt]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const payments = await api(`/fees/${btn.dataset.receipt}/receipt`);
          const list = payments.map(p => `<div class="receipt-strip"><span class="mono">${p.receipt_number}</span><span>₹${p.amount_paid.toLocaleString("en-IN")}</span><span>${new Date(p.payment_date).toLocaleDateString("en-IN")}</span></div>`).join("");
          alert("Receipts:\n" + payments.map(p => `${p.receipt_number} — ₹${p.amount_paid} — ${new Date(p.payment_date).toLocaleDateString("en-IN")}`).join("\n"));
        } catch (err) { toast(err.message, "error"); }
      });
    });
  }
}

// ---------- Students (warden/admin) ----------
let _roomOptionsCache = "";

function studentRowHtml(s) {
  const isAdmin = state.role === "admin";
  return `
    <tr>
      <td class="mono">${s.register_number}</td>
      <td>${s.full_name}</td>
      <td class="mono">${s.username}</td>
      <td>${s.department || "—"}</td>
      <td>${s.year || "—"}</td>
      <td>${s.email}</td>
      <td>${s.room_id ? `Room #${s.room_id}` : "Unassigned"}</td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <select class="select-input" data-allocate="${s.id}">
            <option value="">Allocate…</option>
            ${_roomOptionsCache}
          </select>
          ${s.room_id ? `<button class="btn btn-outline btn-sm" data-vacate="${s.id}">Vacate</button>` : ""}
          ${isAdmin ? `<button class="btn btn-outline btn-sm" data-editcred="${s.id}" data-username="${s.username}">Edit login</button>` : ""}
          ${isAdmin ? `<button class="btn btn-danger btn-sm" data-delete="${s.id}" data-name="${s.full_name}">Delete</button>` : ""}
        </div>
      </td>
    </tr>`;
}

function bindStudentRowEvents() {
  content().querySelectorAll("[data-allocate]").forEach(sel => {
    sel.addEventListener("change", async () => {
      if (!sel.value) return;
      try {
        await api("/rooms/allocate", { method: "POST", body: {
          student_id: Number(sel.dataset.allocate), room_id: Number(sel.value),
        }});
        toast("Room allocated", "success");
        renderStudents();
      } catch (err) { toast(err.message, "error"); }
    });
  });

  content().querySelectorAll("[data-vacate]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/rooms/vacate/${btn.dataset.vacate}`, { method: "POST" });
        toast("Room vacated", "success");
        renderStudents();
      } catch (err) { toast(err.message, "error"); }
    });
  });

  content().querySelectorAll("[data-editcred]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const newUsername = prompt("New username (leave blank to keep unchanged):", btn.dataset.username);
      if (newUsername === null) return; // cancelled
      const newPassword = prompt("New password (leave blank to keep unchanged):");
      if (newPassword === null) return; // cancelled
      const body = {
        new_username: newUsername && newUsername.trim() !== btn.dataset.username ? newUsername.trim() : null,
        new_password: newPassword || null,
      };
      if (!body.new_username && !body.new_password) { toast("No changes made"); return; }
      try {
        await api(`/students/${btn.dataset.editcred}/credentials`, { method: "PUT", body });
        toast("Login credentials updated", "success");
        renderStudents();
      } catch (err) { toast(err.message, "error"); }
    });
  });

  content().querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm(`Permanently delete ${btn.dataset.name}? This removes their account, profile and fee records. This cannot be undone.`)) return;
      try {
        await api(`/students/${btn.dataset.delete}`, { method: "DELETE" });
        toast("Student deleted", "success");
        renderStudents();
      } catch (err) { toast(err.message, "error"); }
    });
  });
}

async function renderStudents() {
  const students = await api("/students");
  const rooms = await api("/rooms");
  _roomOptionsCache = rooms.map(r => `<option value="${r.id}">${r.room_number} (${r.current_occupancy}/${r.capacity})</option>`).join("");

  const rows = students.map(studentRowHtml).join("")
    || `<tr><td colspan="8"><p class="empty-state">No students found.</p></td></tr>`;

  content().innerHTML = `
    ${state.role === "admin" ? `
    <div class="panel" style="margin-top:0">
      <div class="panel-head"><h2>Add Student</h2></div>
      <form id="add-student-form" class="form-row">
        <label>Full name<input type="text" id="as-name" required></label>
        <label>Register number<input type="text" id="as-reg" required></label>
        <label>Department<input type="text" id="as-dept"></label>
        <label>Sem<input type="number" id="as-year" min="1" max="6"></label>
        <label>Email<input type="email" id="as-email" required></label>
        <label>Username<input type="text" id="as-username" required></label>
        <label>Password<input type="password" id="as-password" required></label>
        <button class="btn btn-brass" type="submit">Create student account</button>
      </form>
      <p class="login-error" id="add-student-error"></p>
    </div>` : ""}
    <div class="panel" style="margin-top:${state.role === "admin" ? "20px" : "0"}">
      <div class="panel-head">
        <h2>Students</h2>
        <input class="search-input" id="student-search" placeholder="Search by name or register no.">
      </div>
      <table>
        <thead><tr><th>Reg. No</th><th>Name</th><th>Username</th><th>Dept</th><th>Sem</th><th>Email</th><th>Room</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  if (state.role === "admin") {
    document.getElementById("add-student-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("add-student-error");
      errEl.textContent = "";
      const body = {
        full_name: document.getElementById("as-name").value.trim(),
        register_number: document.getElementById("as-reg").value.trim(),
        department: document.getElementById("as-dept").value.trim() || null,
        year: document.getElementById("as-year").value ? Number(document.getElementById("as-year").value) : null,
        email: document.getElementById("as-email").value.trim(),
        username: document.getElementById("as-username").value.trim(),
        password: document.getElementById("as-password").value,
      };
      try {
        await api("/students", { method: "POST", body });
        toast("Student account created", "success");
        renderStudents();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  bindStudentRowEvents();

  document.getElementById("student-search").addEventListener("input", async (e) => {
    const q = e.target.value;
    const filtered = await api(`/students${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    const body = filtered.map(studentRowHtml).join("")
      || `<tr><td colspan="8"><p class="empty-state">No matches.</p></td></tr>`;
    content().querySelector("tbody").innerHTML = body;
    bindStudentRowEvents();
  });
}

// ---------- Rooms (warden/admin) ----------
async function renderRooms() {
  const rooms = await api("/rooms");
  const blocks = await api("/blocks");
  state.blocksCache = blocks;
  const blockOptions = blocks.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
  const blockName = (id) => blocks.find(b => b.id === id)?.name || "—";

  const rows = rooms.map(r => `
    <tr>
      <td>${blockName(r.block_id)}</td>
      <td>${r.floor}</td>
      <td class="mono">${r.room_number}</td>
      <td>${r.current_occupancy}/${r.capacity}</td>
      <td><span class="tag tag-${r.status}">${r.status}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="5"><p class="empty-state">No rooms yet.</p></td></tr>`;

  content().innerHTML = `
    ${state.role === "admin" ? `
    <div class="panel" style="margin-top:0">
      <div class="panel-head"><h2>Add Room</h2></div>
      <form id="room-form" class="form-row">
        <label>Block<select id="r-block">${blockOptions}</select></label>
        <label>Floor<input type="number" id="r-floor" min="0" required></label>
        <label>Room Number<input type="text" id="r-number" required></label>
        <label>Capacity<input type="number" id="r-cap" min="1" value="2" required></label>
        <button class="btn btn-brass" type="submit">Add room</button>
      </form>
    </div>` : ""}
    <div class="panel">
      <div class="panel-head"><h2>All Rooms</h2></div>
      <table>
        <thead><tr><th>Block</th><th>Floor</th><th>Room No.</th><th>Occupancy</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  if (state.role === "admin") {
    document.getElementById("room-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/rooms", { method: "POST", body: {
          block_id: Number(document.getElementById("r-block").value),
          floor: Number(document.getElementById("r-floor").value),
          room_number: document.getElementById("r-number").value,
          capacity: Number(document.getElementById("r-cap").value),
        }});
        toast("Room added", "success");
        renderRooms();
      } catch (err) { toast(err.message, "error"); }
    });
  }
}

// ---------- Blocks (admin) ----------
async function renderBlocks() {
  const blocks = await api("/blocks");
  const rows = blocks.map(b => `<tr><td>${b.name}</td><td>${b.description || "—"}</td></tr>`).join("")
    || `<tr><td colspan="2"><p class="empty-state">No blocks yet.</p></td></tr>`;

  content().innerHTML = `
    <div class="panel" style="margin-top:0">
      <div class="panel-head"><h2>Add Hostel Block</h2></div>
      <form id="block-form" class="form-row">
        <label>Name<input type="text" id="b-name" required></label>
        <label style="flex:2">Description<input type="text" id="b-desc"></label>
        <button class="btn btn-brass" type="submit">Add block</button>
      </form>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>All Blocks</h2></div>
      <table><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  `;

  document.getElementById("block-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/blocks", { method: "POST", body: {
        name: document.getElementById("b-name").value,
        description: document.getElementById("b-desc").value || null,
      }});
      toast("Block added", "success");
      renderBlocks();
    } catch (err) { toast(err.message, "error"); }
  });
}

// ---------- Boot ----------
(function boot() {
  if (state.token && state.role) {
    enterApp();
  } else {
    showView("view-login");
  }
})();
