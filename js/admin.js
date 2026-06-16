const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "SonyKar2026"
};

const loginPanel = document.querySelector("[data-login-panel]");
const dashboardPanel = document.querySelector("[data-dashboard]");
const bookingList = document.querySelector("[data-booking-list]");
const totalCount = document.querySelector("[data-total]");
const loginStatus = document.querySelector("[data-login-status]");

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem("sonykarakol_bookings") || "[]");
  } catch (error) {
    console.error("Не удалось прочитать заявки:", error);
    return [];
  }
}

function renderBookings() {
  const bookings = getBookings();
  totalCount.textContent = bookings.length;
  bookingList.innerHTML = "";

  if (!bookings.length) {
    bookingList.innerHTML = "<p>Заявок пока нет.</p>";
    return;
  }

  bookings.forEach((booking) => {
    const card = document.createElement("article");
    card.className = "admin-booking";
    card.innerHTML = `
      <div class="booking-head">
        <span>${booking.name}</span>
        <strong>${new Date(booking.createdAt).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}</strong>
      </div>
      <p><strong>Телефон:</strong> ${booking.phone}</p>
      <p><strong>Сообщение:</strong> ${booking.message}</p>
    `;
    bookingList.appendChild(card);
  });
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

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(adminForm);
    const username = String(data.get("username")).trim();
    const password = String(data.get("password")).trim();

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem("sonykarakol_admin_auth", "true");
      showDashboard();
      return;
    }

    loginStatus.textContent = "Неверный логин или пароль.";
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
}

document.addEventListener("DOMContentLoaded", () => {
  initAdmin();
});
