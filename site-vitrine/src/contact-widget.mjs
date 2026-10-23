import { escapeHtml as e } from "./html.mjs";
import { icon } from "./icons.mjs";

export function contactNumber(value) {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[\s()-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(compact) ? compact.replace(/^\+/, "") : null;
}

function readableNumber(digits) {
  return `+${digits}`.replace(/^(\+212)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
}

export function renderHeaderPhone(site) {
  const number = contactNumber(site.phone);
  return number
    ? `<a class="header-phone" href="tel:+${number}" aria-label="Appeler Asad Hospitality au ${e(readableNumber(number))}">${icon("phone")}</a>`
    : "";
}

export function renderContactWidget(site) {
  const phone = contactNumber(site.phone);
  const whatsapp = contactNumber(site.whatsapp);
  if (!phone && !whatsapp) return "";
  const fallback = whatsapp ? `https://wa.me/${whatsapp}` : `tel:+${phone}`;
  return `<div class="contact-widget" data-contact-widget>
    <div class="contact-options" id="contact-options" role="group" aria-label="Choisir un moyen de contact" hidden>
      <div class="contact-options-heading"><span>Parlons de votre projet</span><button type="button" data-contact-close aria-label="Fermer les options de contact">${icon("close")}</button></div>
      ${phone ? `<a class="contact-choice" data-contact-call href="tel:+${phone}"><span class="contact-choice-icon">${icon("phone")}</span><span>Appeler<small>${e(readableNumber(phone))}</small></span>${icon("diagonal")}</a>` : ""}
      ${whatsapp ? `<a class="contact-choice contact-choice-whatsapp" data-contact-whatsapp href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer"><span class="contact-choice-icon">${icon("message")}</span><span>WhatsApp<small>Envoyer un message</small></span>${icon("diagonal")}</a>` : ""}
    </div>
    <button class="contact-launcher" type="button" data-contact-toggle aria-label="Nous contacter" aria-expanded="false" aria-controls="contact-options" hidden>${icon("message")}<span>Nous contacter</span></button>
    <noscript><a class="contact-launcher" href="${fallback}">${icon("message")}<span>Nous contacter</span></a></noscript>
  </div>`;
}
