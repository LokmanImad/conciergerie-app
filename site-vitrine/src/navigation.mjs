import { brandLogo } from "./brand.mjs";
import { icon } from "./icons.mjs";
import { renderHeaderPhone } from "./contact-widget.mjs";

const primary = [
  ["/gestion-locative", "Gestion locative"],
  ["/sous-location", "Sous-location"],
  ["/achat-investissement", "Investir"],
  ["/destinations", "Destinations"],
];
const secondary = [
  ["/a-propos", "L’approche Asad", "spark"],
  ["/projets", "Les projets neufs", "building"],
  ["/#application", "Notre application", "house"],
];

export function renderNavigation(site, pathname) {
  const active = (href) => (pathname === href ? ' aria-current="page"' : "");
  const links = primary
    .map(([href, label]) => `<a href="${href}"${active(href)}>${label}</a>`)
    .join("");

  return `<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header" data-header>
      <a class="brand" href="/" aria-label="Asad Hospitality — accueil">${brandLogo(site)}</a>
      <nav class="desktop-nav" aria-label="Navigation principale">${links}
        <button class="more-toggle" type="button" data-menu-toggle aria-label="Afficher les autres rubriques" aria-expanded="false" aria-controls="site-menu" hidden><span>Plus</span><span class="nav-chevron" aria-hidden="true"></span></button>
      </nav>
      <a class="header-contact" href="/contact"><span>Parlons de votre bien</span>${icon("diagonal")}</a>
      ${renderHeaderPhone(site)}
      <button class="menu-toggle" type="button" data-menu-toggle aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="site-menu" hidden><span>Menu</span><span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span></span></button>
      <div id="site-menu" class="site-menu" hidden>
        <div class="menu-panel-heading"><span>Découvrir Asad</span><button type="button" class="menu-close" data-menu-close aria-label="Fermer le menu">${icon("close")}</button></div>
        <nav class="menu-primary" aria-label="Navigation principale sur mobile">${primary.map(([href, label]) => `<a href="${href}"${active(href)}><span>${label}</span>${icon("diagonal")}</a>`).join("")}</nav>
        <nav class="menu-secondary" aria-label="Autres rubriques">${secondary.map(([href, label, symbol]) => `<a href="${href}"${active(href)}><span class="menu-link-icon">${icon(symbol)}</span><span>${label}${href === "/#application" ? "<small>En développement</small>" : ""}</span>${icon("diagonal")}</a>`).join("")}</nav>
        <a class="menu-project" href="/contact"><span>Parlons de votre projet</span>${icon("diagonal")}</a>
      </div>
    </header>
    <noscript><nav class="navigation-fallback" aria-label="Toutes les rubriques">${links}${secondary.map(([href, label]) => `<a href="${href}"${active(href)}>${label}</a>`).join("")}<a href="/contact">Nous contacter</a></nav></noscript>`;
}
