const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "SonyKar2026"
};

const loginPanel = document.querySelector("[data-login-panel]");
const dashboardPanel = document.querySelector("[data-dashboard]");
const bookingList = document.querySelector("[data-booking-list]");
const totalCount = document.querySelector("[data-total]");
const loginStatus = document.querySelector("[data-login-status]");

function getLocalBookings() {
  try {
    return JSON.parse(localStorage.getItem("sonykarakol_bookings") || "[]");
  } catch {
    return [];
  }
}

function saveLocalBookings(bookings) {
  localStorage.setItem("sonykarakol_bookings", JSON.stringify(bookings));
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function computeStats(bookings) {
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString('ru-RU'), count: 0 });
  }
  bookings.forEach((b) => {
    const iso = b.createdAt || '';
    if (!iso) return;
    const key = iso.slice(0, 10);
    const day = days.find(x => x.key === key);
    if (day) day.count++;
  });
  const total = bookings.length;
  const avg = total / 7;
  return { days, total, avg };
}

function renderStats(bookings) {
  const container = document.querySelector('[data-stats]');
  if (!container) return;
  const statsList = container.querySelector('[data-stats-list]');
  const avgEl = container.querySelector('[data-avg]');
  const totalEl = container.querySelector('[data-total]');
  const stats = computeStats(bookings || []);
  statsList.innerHTML = '';
  stats.days.forEach(d => {
    const li = document.createElement('li');
    li.textContent = `${d.label}: ${d.count}`;
    statsList.appendChild(li);
  });
  if (avgEl) avgEl.textContent = stats.avg.toFixed(2);
  if (totalEl) totalEl.textContent = stats.total;
}

function exportCSV(bookings) {
  const rows = [['id','name','phone','message','createdAt']];
  bookings.forEach((b,i) => rows.push([i+1, b.name||'', b.phone||'', b.message||'', b.createdAt||'']));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookings_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderBookings() {
  const bookings = getLocalBookings();
  totalCount.textContent = bookings.length;
  bookingList.innerHTML = "";
  if (!bookings.length) {
    bookingList.innerHTML = "<p>Заявок пока нет.</p>";
    return;
  }
  bookings.forEach((booking, i) => {
    const card = document.createElement("article");
    card.className = "admin-booking";
    const date = formatDate(booking.createdAt);
    card.innerHTML = `
      <div class="booking-head">
        <span>${booking.name}</span>
        <strong>${date}</strong>
      </div>
      <p><strong>Телефон:</strong> ${booking.phone}</p>
      <p><strong>Сообщение:</strong> ${booking.message}</p>
      <div style="margin-top:12px;"><button class="btn btn-secondary btn-delete" data-index="${i}">Удалить</button></div>
    `;
    bookingList.appendChild(card);
  });
  bookingList.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Удалить заявку?")) return;
      const index = btn.dataset.index;
      const bookings = getLocalBookings();
      bookings.splice(index,1);
      saveLocalBookings(bookings);
      renderBookings();
    });
  });
  renderStats(bookings);
}

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  renderBookings();
}

function showLogin() {
  loginPanel.classList.remove("hidden");
  dashboardPanel.classList.add("hidden");
  loginStatus.textContent = "";
}

function initAdmin() {
  const adminForm = document.querySelector("[data-admin-form]");
  const logoutButton = document.querySelector("[data-logout]");
  const clearButton = document.querySelector("[data-clear]");
  const exportBtn = document.querySelector('[data-export]');
  const refreshBtn = document.querySelector('[data-refresh]');

  if (localStorage.getItem("sonykarakol_admin_auth") === "true") {
    showDashboard();
  }

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(adminForm);
    const username = String(data.get("username")).trim();
    const password = String(data.get("password")).trim();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem("sonykarakol_admin_auth", "true");
      showDashboard();
    } else {
      loginStatus.textContent = "Неверный логин или пароль.";
    }
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("sonykarakol_admin_auth");
    showLogin();
  });

  clearButton.addEventListener("click", () => {
    if (!confirm("Очистить все заявки?")) return;
    localStorage.removeItem("sonykarakol_bookings");
    renderBookings();
  });

  exportBtn.addEventListener('click', () => {
    const bookings = getLocalBookings();
    exportCSV(bookings);
  });

  refreshBtn.addEventListener('click', () => {
    renderBookings();
    alert('Статистика обновлена');
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAdmin();
});
