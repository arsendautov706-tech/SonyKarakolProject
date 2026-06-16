import {
  initFirebase,
  fetchBookingsFromFirestore,
  deleteBookingInFirestore,
  sendBookingToFirestore,
  signIn,
  createUser,
  setAdminRole
} from "./firebase-config.js";

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
  } catch (error) {
    console.error("Не удалось прочитать заявки:", error);
    return [];
  }
}

async function getBookings() {
  // prefer Firestore if available
  try {
    const items = await fetchBookingsFromFirestore();
    return items;
  } catch (err) {
    return getLocalBookings();
  }
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
  } catch (e) {
    return iso;
  }
}

async function renderBookings() {
  const bookings = await getBookings();
  totalCount.textContent = bookings.length;
  bookingList.innerHTML = "";

  if (!bookings.length) {
    bookingList.innerHTML = "<p>Заявок пока нет.</p>";
    return;
  }

  bookings.forEach((booking) => {
    const card = document.createElement("article");
    card.className = "admin-booking";
    const date = formatDate(booking.createdAt || booking.created_at || booking.created);
    card.innerHTML = `
      <div class="booking-head">
        <span>${booking.name}</span>
        <strong>${date}</strong>
      </div>
      <p><strong>Телефон:</strong> ${booking.phone}</p>
      <p><strong>Сообщение:</strong> ${booking.message}</p>
      <div style="margin-top:12px;"><button class="btn btn-secondary btn-delete" data-id="${booking.id || booking._id || ''}">Удалить</button></div>
    `;
    bookingList.appendChild(card);
  });

  // attach delete handlers
  bookingList.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      if (!id) {
        // localStorage item without id — clear all fallback
        if (!confirm("Удалить эту заявку локально?")) return;
        // attempt to remove by matching content
        const article = btn.closest('.admin-booking');
        const phoneLine = article.querySelector('p').textContent || '';
        const phone = phoneLine.replace('Телефон:', '').trim();
        let bookings = getLocalBookings();
        bookings = bookings.filter(b => b.phone !== phone);
        localStorage.setItem('sonykarakol_bookings', JSON.stringify(bookings));
        await renderBookings();
        return;
      }

      if (!confirm('Удалить заявку?')) return;
      try {
        await deleteBookingInFirestore(id);
        await renderBookings();
      } catch (err) {
        console.error('Не удалось удалить в Firestore, удаляю локально', err);
        const bookings = getLocalBookings().filter(b => String(b.id) !== String(id));
        localStorage.setItem('sonykarakol_bookings', JSON.stringify(bookings));
        await renderBookings();
      }
    });
  });

  // update stats after rendering bookings
  try {
    renderStats(bookings);
  } catch (e) {
    console.warn('Stats render failed', e);
  }
}

function computeStats(bookings) {
  // bookings: array with createdAt ISO strings
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString('ru-RU'), count: 0 });
  }

  bookings.forEach((b) => {
    const iso = b.createdAt || b.created_at || b.created || '';
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
  bookings.forEach(b => rows.push([b.id || '', '"'+(b.name||'')+'"', '"'+(b.phone||'')+'"', '"'+( (b.message||'').replace(/"/g,'""') )+'"', b.createdAt || '']));
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

  if (localStorage.getItem("sonykarakol_admin_auth") === "true") {
    showDashboard();
  }

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(adminForm);
    const username = String(data.get("username")).trim();
    const password = String(data.get("password")).trim();
    // try Firebase sign-in (email used as username)
    try {
      const cred = await signIn(username, password);
      // if sign-in succeeded, show dashboard
      localStorage.setItem("sonykarakol_admin_auth", "true");
      showDashboard();
      return;
    } catch (err) {
      // fallback to local credential
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem("sonykarakol_admin_auth", "true");
        showDashboard();
        return;
      }
      loginStatus.textContent = "Неверный логин или пароль.";
    }
  });

  logoutButton.addEventListener("click", async () => {
    localStorage.removeItem("sonykarakol_admin_auth");
    showLogin();
  });

  clearButton.addEventListener("click", async () => {
    if (!confirm("Очистить все заявки?")) return;
    try {
      const bookings = await getBookings();
      // try delete each in firestore by id
      for (const b of bookings) {
        if (b.id) {
          await deleteBookingInFirestore(b.id).catch(() => {});
        }
      }
      // clear local fallback
      localStorage.removeItem("sonykarakol_bookings");
      await renderBookings();
    } catch (err) {
      console.error('Ошибка при очистке:', err);
    }
  });

  // migrate localStorage bookings to Firestore
  const migrateBtn = document.querySelector('[data-migrate]');
  if (migrateBtn) {
    migrateBtn.addEventListener('click', async () => {
      if (!confirm('Мигрировать все локальные заявки в Firestore?')) return;
      const locals = getLocalBookings();
      for (const b of locals) {
        try {
          await sendBookingToFirestore(b);
        } catch (e) {
          console.error('Ошибка при миграции', e);
        }
      }
      localStorage.removeItem('sonykarakol_bookings');
      await renderBookings();
      alert('Миграция завершена');
    });
  }

  // create admin form handler
  const createForm = document.querySelector('[data-create-admin]');
  const createStatus = document.querySelector('[data-create-status]');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(createForm);
      const email = String(fd.get('email')).trim();
      const password = String(fd.get('password')).trim();
      const role = String(fd.get('role')).trim() || 'admin';
      if (createStatus) createStatus.textContent = '';
      try {
        const userCred = await createUser(email, password);
        const uid = userCred.user.uid;
        await setAdminRole(uid, role);
        if (createStatus) createStatus.textContent = 'Администратор создан.';
        createForm.reset();
      } catch (err) {
        console.error(err);
        if (createStatus) createStatus.textContent = 'Ошибка: ' + (err.message || err.code || 'неизвестно');
      }
    });
  }

  // export and refresh handlers
  const exportBtn = document.querySelector('[data-export]');
  const refreshBtn = document.querySelector('[data-refresh]');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const bookings = await getBookings();
      exportCSV(bookings);
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await renderBookings();
      alert('Статистика обновлена');
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // initialize Firebase if config provided
  initFirebase();
  initAdmin();
});
