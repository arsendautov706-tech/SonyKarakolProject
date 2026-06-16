import { initFirebase, sendBookingToFirestore } from "./firebase-config.js";

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const navLinks = [...document.querySelectorAll(".nav a[href^='#']")];
const sections = [...document.querySelectorAll("main section[id]")];

function initHeader() {
  const sync = () => header.classList.toggle("scrolled", window.scrollY > 20);
  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

function initMenu() {
  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    header.classList.toggle("menu-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      header.classList.remove("menu-open");
    });
  });
}

function initActiveNavigation() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
}

function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.dataset.done) return;
        entry.target.dataset.done = "true";
        const target = Number(entry.target.dataset.count);
        const start = performance.now();
        const duration = 950;

        const tick = (time) => {
          const progress = Math.min((time - start) / duration, 1);
          entry.target.textContent = Math.round(target * progress);
          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function initLightbox() {
  const lightbox = document.querySelector("[data-lightbox]");
  const image = document.querySelector("[data-lightbox-img]");
  const items = [...document.querySelectorAll("[data-gallery]")];
  let currentIndex = 0;

  const open = (index) => {
    currentIndex = index;
    image.src = items[currentIndex].dataset.gallery;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
  };

  const move = (step) => {
    currentIndex = (currentIndex + step + items.length) % items.length;
    image.src = items[currentIndex].dataset.gallery;
  };

  items.forEach((item, index) => item.addEventListener("click", () => open(index)));
  document.querySelector("[data-lightbox-close]").addEventListener("click", close);
  document.querySelector("[data-lightbox-prev]").addEventListener("click", () => move(-1));
  document.querySelector("[data-lightbox-next]").addEventListener("click", () => move(1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("open")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  });
}

function saveBookingLocal(data) {
  try {
    const bookings = JSON.parse(localStorage.getItem("sonykarakol_bookings") || "[]");
    bookings.unshift(data);
    localStorage.setItem("sonykarakol_bookings", JSON.stringify(bookings));
  } catch (error) {
    console.error("Не удалось сохранить заявку локально:", error);
  }
}

function initForm() {
  const form = document.querySelector("[data-form]");
  const status = document.querySelector("[data-status]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;
    const data = new FormData(form);
    const fields = {
      name: form.querySelector("[name='name']"),
      phone: form.querySelector("[name='phone']"),
      message: form.querySelector("[name='message']")
    };

    form.querySelectorAll("small").forEach((item) => (item.textContent = ""));

    if (String(data.get("name")).trim().length < 2) {
      fields.name.nextElementSibling.textContent = "Введите имя минимум из 2 символов.";
      valid = false;
    }

    if (!/^\+?\d[\d\s()-]{8,}$/.test(String(data.get("phone")).trim())) {
      fields.phone.nextElementSibling.textContent = "Введите корректный номер телефона.";
      valid = false;
    }

    if (String(data.get("message")).trim().length < 8) {
      fields.message.nextElementSibling.textContent = "Напишите дату, время или вопрос.";
      valid = false;
    }

    if (!valid) return;

    const booking = {
      name: String(data.get("name")).trim(),
      phone: String(data.get("phone")).trim(),
      message: String(data.get("message")).trim(),
      createdAt: new Date().toISOString()
    };

    // try to send to Firestore if available
    try {
      // initFirebase will have been called on DOMContentLoaded; sendBookingToFirestore throws if not initialized
      await sendBookingToFirestore(booking);
      status.textContent = "Заявка принята. Администратор свяжется с вами для подтверждения.";
      form.reset();
      return;
    } catch (err) {
      // fallback to localStorage
      saveBookingLocal(booking);
      status.textContent = "Заявка принята (сохранено локально). Администратор свяжется с вами.";
      form.reset();
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // try initialize Firebase (if user filled firebase-config.js)
  try {
    initFirebase();
  } catch (e) {
    console.warn("Firebase init skipped:", e);
  }

  initHeader();
  initMenu();
  initActiveNavigation();
  initReveal();
  initCounters();
  initLightbox();
  initForm();
});
