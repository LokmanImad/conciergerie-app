const menuButtons = [...document.querySelectorAll("[data-menu-toggle]")];
const siteMenu = document.querySelector("#site-menu");
if (menuButtons.length && siteMenu) {
  let opener = null;
  const isInsideMenu = (target) =>
    siteMenu.contains(target) ||
    menuButtons.some((button) => button.contains(target));

  function closeMenu(returnFocus = false) {
    siteMenu.hidden = true;
    menuButtons.forEach((button) =>
      button.setAttribute("aria-expanded", "false"),
    );
    if (returnFocus) opener?.focus({ preventScroll: true });
  }

  menuButtons.forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", (event) => {
      if (!siteMenu.hidden) {
        closeMenu();
        return;
      }
      opener = button;
      siteMenu.hidden = false;
      document.dispatchEvent(new Event("site-menu-open"));
      menuButtons.forEach((toggle) =>
        toggle.setAttribute("aria-expanded", "true"),
      );
      // Keyboard users reach the first visible destination immediately.
      // This is a disclosure, not a modal: the page stays scrollable and usable.
      if (event.detail === 0) {
        [...siteMenu.querySelectorAll("a")]
          .find((link) => link.getClientRects().length)
          ?.focus({ preventScroll: true });
      }
    });
  });
  siteMenu
    .querySelector("[data-menu-close]")
    .addEventListener("click", () => closeMenu(true));
  siteMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!siteMenu.hidden && !isInsideMenu(event.target)) closeMenu();
  });
  document.addEventListener("focusin", (event) => {
    if (!siteMenu.hidden && !isInsideMenu(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !siteMenu.hidden) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  const desktopLayout = window.matchMedia("(min-width: 981px)");
  let wasDesktop = desktopLayout.matches;
  desktopLayout.addEventListener("change", (event) => {
    if (event.matches === wasDesktop) return;
    wasDesktop = event.matches;
    closeMenu();
  });
  window.addEventListener("pagehide", () => closeMenu());
  document.addEventListener("contact-widget-open", () => closeMenu());
}

const contactWidget = document.querySelector("[data-contact-widget]");
if (contactWidget) {
  const toggle = contactWidget.querySelector("[data-contact-toggle]");
  const options = contactWidget.querySelector("#contact-options");
  function closeContact(returnFocus = false) {
    options.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("contact-open");
    if (returnFocus) toggle.focus({ preventScroll: true });
  }
  toggle.hidden = false;
  toggle.addEventListener("click", (event) => {
    if (!options.hidden) return closeContact();
    document.dispatchEvent(new Event("contact-widget-open"));
    options.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("contact-open");
    if (event.detail === 0)
      options.querySelector("a")?.focus({ preventScroll: true });
  });
  contactWidget
    .querySelector("[data-contact-close]")
    .addEventListener("click", () => closeContact(true));
  options.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeContact();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!options.hidden && !contactWidget.contains(event.target))
      closeContact();
  });
  document.addEventListener("focusin", (event) => {
    if (!options.hidden && !contactWidget.contains(event.target))
      closeContact();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !options.hidden) {
      event.preventDefault();
      closeContact(true);
    }
  });
  document.addEventListener("site-menu-open", () => closeContact());
  window
    .matchMedia("(min-width: 981px)")
    .addEventListener("change", () => closeContact());
  window.addEventListener("pagehide", () => closeContact());
}

const header = document.querySelector("[data-header]");
const backTop = document.querySelector("[data-back-top]");
function syncScroll() {
  header?.classList.toggle("scrolled", window.scrollY > 15);
  backTop?.classList.toggle("visible", window.scrollY > 650);
}
window.addEventListener("scroll", syncScroll, { passive: true });
syncScroll();

if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.07 },
  );
  document
    .querySelectorAll("[data-reveal]")
    .forEach((element) => observer.observe(element));
  document.documentElement.classList.add("reveal-enabled");
}

document.querySelectorAll("[data-city-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const city = button.dataset.cityFilter;
    document.querySelectorAll("[data-city-filter]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-project-city]").forEach((project) => {
      project.hidden = city !== "all" && project.dataset.projectCity !== city;
    });
  });
});

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const query = new URLSearchParams(window.location.search);
  for (const [param, field] of [
    ["sujet", "subject"],
    ["ville", "city"],
  ]) {
    const select = contactForm.elements.namedItem(field);
    const value = query.get(param);
    if ([...select.options].some((option) => option.value === value))
      select.value = value;
  }
  const status = contactForm.querySelector("[data-form-status]");
  const submit = contactForm.querySelector("[type=submit]");
  const initialText = submit.innerHTML;
  let requestId = crypto.randomUUID();
  let sending = false;
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const controls = [...contactForm.querySelectorAll("input,select,textarea")];
    controls.forEach((input) => input.removeAttribute("aria-invalid"));
    const invalid = controls.find((input) => !input.checkValidity());
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
      status.textContent =
        "Vérifiez les champs obligatoires, votre e-mail et le message (15 caractères minimum).";
      status.className = "form-status error";
      invalid.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(contactForm));
    data.consent = data.consent === "on";
    data.requestId = requestId;
    sending = true;
    submit.disabled = true;
    contactForm.setAttribute("aria-busy", "true");
    submit.textContent = "Envoi en cours…";
    status.textContent = "";
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "L’envoi a échoué. Réessayez ou contactez-nous directement.",
        );
      status.textContent =
        "Merci ! Votre demande a bien été envoyée à Asad Hospitality.";
      status.className = "form-status success";
      contactForm.reset();
      requestId = crypto.randomUUID();
    } catch (error) {
      status.textContent =
        error.name === "TimeoutError"
          ? "Le délai d’envoi est dépassé. Réessayez ou contactez-nous directement par e-mail ou WhatsApp."
          : error.message ||
            "Envoi impossible. Vous pouvez nous joindre directement par e-mail ou WhatsApp.";
      status.className = "form-status error";
    } finally {
      sending = false;
      submit.disabled = false;
      submit.innerHTML = initialText;
      contactForm.removeAttribute("aria-busy");
    }
  });
}
