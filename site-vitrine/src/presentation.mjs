import { escapeHtml as e } from "./html.mjs";
import { icon } from "./icons.mjs";

export const contact = (subject = "", city = "") =>
  `/contact${subject || city ? `?${new URLSearchParams({ ...(subject ? { sujet: subject } : {}), ...(city ? { ville: city } : {}) })}` : ""}`;

export const button = (text, href, style = "primary") =>
  `<a class="button button-${style}" href="${e(href)}"><span>${text}</span>${icon("arrow")}</a>`;

export const sectionLabel = (text) =>
  `<p class="eyebrow"><span></span>${text}</p>`;

export const image = (name, alt, className = "", priority = false) =>
  `<img class="${className}" src="/assets/${name}" alt="${e(alt)}" width="1600" height="1100" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

export function faqList(items) {
  return `<div class="faq-list">${items
    .map(
      ([question, answer], index) => `
    <details><summary><span class="faq-index">0${index + 1}</span><span>${e(question)}</span>${icon("plus")}</summary><p>${e(answer)}</p></details>`,
    )
    .join("")}</div>`;
}

export function cta(
  title = "Et si on parlait de votre projet ?",
  description = "Un appartement à confier, un bien à proposer ou une envie d’investir. Prenons le temps d’en discuter.",
) {
  return `<section class="closing-cta"><div class="wrap closing-inner"><div>${sectionLabel("LE DÉBUT D’UNE BELLE COLLABORATION")}<h2>${title}</h2><p>${description}</p></div>${button("Faisons connaissance", "/contact", "cream")}</div><span class="cta-orbit" aria-hidden="true"></span></section>`;
}
