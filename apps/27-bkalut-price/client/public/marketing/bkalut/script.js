// Minimal client-side behaviors: modal open/close + soft-scroll for nav.
(function () {
  // Modal triggers
  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-modal]");
    if (trigger) {
      event.preventDefault();
      const id = "modal-" + trigger.getAttribute("data-modal");
      const dialog = document.getElementById(id);
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
      return;
    }
    const closer = event.target.closest("[data-close]");
    if (closer) {
      const dialog = closer.closest("dialog");
      if (dialog && dialog.open) dialog.close();
    }
  });

  // Click outside dialog content => close
  document.querySelectorAll("dialog.modal").forEach(function (d) {
    d.addEventListener("click", function (e) {
      const rect = d.getBoundingClientRect();
      if (
        e.clientY < rect.top ||
        e.clientY > rect.bottom ||
        e.clientX < rect.left ||
        e.clientX > rect.right
      ) {
        d.close();
      }
    });
  });

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]:not([data-modal])').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Contact form -- demo guard.
  const form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const status = document.createElement("p");
      status.className = "form-note";
      status.style.color = "#0f5e57";
      status.textContent = "תודה — באתר הדמו לא נשלחת בקשה. בייצור, הקליטה עוברת ב-n8n של בקלות.";
      form.appendChild(status);
      setTimeout(() => status.remove(), 6000);
    });
  }
})();
