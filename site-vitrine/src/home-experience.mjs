import { escapeHtml as e } from "./html.mjs";
import { icon } from "./icons.mjs";
import {
  button,
  contact,
  image,
  sectionLabel,
  faqList,
} from "./presentation.mjs";

function signatureSeal() {
  return `<a class="signature-seal" href="/a-propos" aria-label="Découvrir l’esprit Asad Hospitality">
    <svg class="seal-lettering" viewBox="0 0 140 140" aria-hidden="true"><defs><path id="seal-circle" d="M70,70m-52,0a52,52 0 1,1 104,0a52,52 0 1,1 -104,0"/></defs><text><textPath href="#seal-circle" textLength="326">ASAD HOSPITALITY · WHERE HOSPITALITY ROARS · </textPath></text></svg>
    <span>${icon("diagonal")}</span>
  </a>`;
}

function hero(site) {
  return `<section class="signature-hero" aria-labelledby="home-title">
    <div class="signature-hero-image">${image("interior.webp", "La lumière entre dans un appartement aux matières naturelles — photographie d’ambiance", "", true)}</div>
    <div class="signature-hero-shade"></div>
    <div class="signature-hero-content wrap">
      <div class="signature-hero-top"><p class="signature-kicker"><span></span> L’ESPRIT ASAD · MAROC</p><span class="signature-edition">CONCIERGERIE & IMMOBILIER</span></div>
      <h1 id="home-title"><span>${e(site.hero.title)}</span><em>${e(site.hero.emphasis)}</em></h1>
      <div class="signature-hero-description"><span class="signature-vertical-rule"></span><p>${e(site.hero.description)}</p></div>
      <div class="signature-hero-actions">${button("Confier mon appartement", contact("gestion-locative"), "cream")}<a class="signature-link" href="/achat-investissement">Imaginer mon investissement ${icon("diagonal")}</a></div>
      <div class="signature-hero-footnote"><span>Le sens de l’accueil.</span><span>L’exigence du détail.</span></div>
    </div>
    <div class="signature-photo-note"><span>01 / L’ART DE PRENDRE SOIN</span><p>Des lieux à vivre.<br><em>Des liens à créer.</em></p></div>
    ${signatureSeal()}
    <div class="signature-hero-bottom wrap"><a href="#collection" class="signature-scroll"><span class="scroll-line"></span> DÉCOUVRIR NOTRE UNIVERS</a><span>TANGER · TÉTOUAN · ASILAH</span><a href="/destinations/marrakech">Marrakech, bientôt ${icon("diagonal")}</a></div>
  </section>`;
}

function collection(services) {
  return `<section class="signature-collection section wrap" id="collection">
    <div class="signature-section-meta" data-reveal><span>01 — NOTRE SAVOIR-FAIRE</span><span>UNE MÊME EXIGENCE. TROIS FAÇONS DE VOUS ACCOMPAGNER.</span></div>
    <div class="signature-section-heading" data-reveal><h2>Votre projet mérite<br><em>une autre attention.</em></h2><p>Gérer, accueillir, trouver la bonne adresse.<br> Nous vous accompagnons là où votre<br> histoire immobilière commence.</p></div>
    <div class="signature-services">${services
      .map(
        (service) => `
      <a href="/${service.slug}" class="signature-service signature-service-${service.number}" data-reveal>
        <div class="signature-service-photo">${image(service.image, `Photographie d’ambiance — ${service.name}`)}</div>
        <div class="signature-service-shade"></div>
        <span class="signature-service-number">${service.number}</span>
        <div class="signature-service-copy"><span class="signature-service-label">${service.slug === "achat-investissement" ? "TROUVER LA BONNE ADRESSE" : service.slug === "sous-location" ? "IMAGINER UNE COLLABORATION" : "CONFIER EN TOUTE CONFIANCE"}</span><h3>${service.name}</h3><p>${service.short}</p></div>
        <span class="signature-service-arrow">${icon("diagonal")}</span>
      </a>`,
      )
      .join("")}</div>
    <div class="signature-collection-bottom"><p>Chaque appartement est différent.<br>Notre accompagnement commence par vous écouter.</p><a class="text-link" href="/contact">Trouvons votre formule ${icon("diagonal")}</a></div>
  </section>`;
}

function philosophy() {
  return `<section class="signature-philosophy">
    <div class="wrap signature-philosophy-grid">
      <div class="signature-collage" data-reveal>
        <div class="signature-collage-main">${image("terrace.webp", "Une terrasse ouverte sur un espace de détente — photographie d’ambiance")}</div>
        <div class="signature-collage-detail">${image("courtyard.webp", "Détail architectural et artisanat marocain")}</div>
        <span class="signature-collage-caption">LES LIEUX ONT UNE ÂME. NOUS Y SOMMES ATTENTIFS.</span>
        <span class="signature-collage-line" aria-hidden="true"></span>
      </div>
      <div class="signature-philosophy-copy" data-reveal>${sectionLabel("L’HOSPITALITÉ EST DANS LES DÉTAILS")}<h2>Vous confiez<br>les clés.<br><em>Nous créons<br>la confiance.</em></h2><p>Un accueil qui se prépare. Un appartement dont on prend soin. Une présence au bon moment. C’est ainsi que nous envisageons notre métier.</p><p>Chez Asad Hospitality, la gestion immobilière commence par une relation personnelle, et se poursuit dans l’attention portée au quotidien.</p><a class="text-link" href="/a-propos">Une certaine idée de l’hospitalité ${icon("diagonal")}</a></div>
    </div>
    <p class="signature-manifesto" aria-hidden="true">Accueillir. Prendre soin. Valoriser.</p>
  </section>`;
}

function destinations(site) {
  return `<section class="section signature-destinations wrap" id="destinations">
    <div class="signature-section-meta" data-reveal><span>02 — NOS ANCRAGES</span><span>UNE PRÉSENCE LOCALE. UN REGARD PERSONNEL.</span></div>
    <div class="signature-section-heading" data-reveal><h2>Le Maroc.<br><em>Intensément.</em></h2><div><p>Trois villes qui nous inspirent.<br>Une quatrième qui nous attend.</p><a class="text-link" href="/destinations">Explorer nos destinations ${icon("diagonal")}</a></div></div>
    <div class="signature-destination-grid">${site.destinations
      .map(
        (city, index) => `
      <a href="/destinations/${city.slug}" class="signature-destination ${!city.available ? "signature-destination-soon" : ""}" data-reveal>
        <div class="signature-destination-photo">${image(city.image, `Architecture et art de vivre — ${city.name}`)}<span class="signature-destination-status">${city.available ? "À VOS CÔTÉS" : "PROCHAINEMENT"}</span><span class="signature-destination-open">${icon("diagonal")}</span></div>
        <div class="signature-destination-name"><span>0${index + 1}</span><h3>${e(city.name)}</h3></div><p>${e(city.tagline)}</p>
      </a>`,
      )
      .join("")}</div>
    <p class="image-disclaimer">Photographies d’ambiance. Aucun bien présenté à la vente ou à la location dans ces visuels.</p>
  </section>`;
}

function investment() {
  return `<section class="signature-investment">
    <div class="signature-investment-photo">${image("architecture.webp", "Un intérieur contemporain — photographie d’ambiance")}</div>
    <div class="signature-investment-shade"></div>
    <div class="wrap signature-investment-inner"><div class="signature-investment-copy" data-reveal>${sectionLabel("03 — ACHAT & INVESTISSEMENT")}<h2>Votre prochain<br>chapitre a<br><em>une adresse.</em></h2><p>Un pied-à-terre au Maroc. Un premier achat. Un projet locatif. Nous vous aidons à explorer les opportunités et les programmes neufs qui répondent à votre recherche.</p>${button("Explorer les projets neufs", "/projets", "cream")}<p class="signature-investment-note">Prix, disponibilités et dates de livraison<br>à confirmer pour chaque programme.</p></div><a class="signature-investment-note-card" href="/achat-investissement"><span>DE L’IDÉE À LA RÉALITÉ</span><p>Faisons de votre recherche<br><em>un projet concret.</em></p>${icon("diagonal")}</a></div>
  </section>`;
}

function application(preview) {
  return `<section class="section wrap signature-application" id="application"><div class="signature-app-heading" data-reveal><span class="status-badge"><span></span> NOTRE APPLICATION · EN DÉVELOPPEMENT</span><h2>L’attention est humaine.<br><em>La gestion, connectée.</em></h2><p>Nous développons notre application pour réunir réservations, voyageurs, charges et opérations. Un outil pensé pour notre équipe et les utilisateurs autorisés, sur ordinateur et mobile.</p><a class="text-link" href="${contact("application")}">Découvrir ce que nous préparons ${icon("diagonal")}</a></div><div class="signature-app-scene" data-reveal><span class="signature-app-label">ASAD DIGITAL — LE PROCHAIN CHAPITRE</span>${preview}<div class="signature-app-note">${icon("spark")}<span>Une vue d’ensemble.<br><strong>Le soin de chaque détail.</strong></span></div></div></section>`;
}

function invitation(site) {
  const whatsapp = site.whatsapp.replace(/\D/g, "");
  return `<section class="signature-invitation"><div class="wrap"><div class="signature-invitation-top">${sectionLabel("LES BELLES HISTOIRES COMMENCENT PAR UN ÉCHANGE")}<span>TANGER · TÉTOUAN · ASILAH</span></div><a href="/contact" class="signature-invitation-link"><h2>Et si on écrivait<br><em>la suite ensemble ?</em></h2><span class="signature-invitation-arrow">${icon("diagonal")}</span></a><div class="signature-invitation-bottom"><p>Votre appartement. Votre projet. Votre prochaine adresse.</p>${whatsapp ? `<a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">Un premier échange sur WhatsApp ${icon("diagonal")}</a>` : ""}</div></div></section>`;
}

export function renderHomeExperience(site, services, applicationPreview) {
  return `${hero(site)}
    ${collection(services)}
    ${philosophy()}
    ${destinations(site)}
    ${investment()}
    ${application(applicationPreview)}
    <section class="section wrap signature-faq"><div data-reveal>${sectionLabel("EN TOUTE SIMPLICITÉ")}<h2>Avant de<br><em>se rencontrer.</em></h2><p>Quelques réponses pour faire connaissance.<br>Et toujours, le plaisir d’en discuter.</p></div>${faqList(
      [
        [
          "À qui s’adressent vos services ?",
          "Aux propriétaires qui souhaitent confier la gestion de leur appartement ou proposer leur bien en sous-location, ainsi qu’aux personnes qui préparent un achat immobilier.",
        ],
        [
          "Où intervenez-vous aujourd’hui ?",
          "Nous sommes présents à Tanger, Tétouan et Asilah. Notre arrivée à Marrakech est en préparation ; vous pouvez nous contacter pour être informé de l’ouverture.",
        ],
        [
          "Comment démarre une collaboration ?",
          "Par une conversation sur votre bien, votre recherche et vos attentes. Nous étudions ensuite votre projet avant de vous présenter une proposition adaptée.",
        ],
        [
          "L’application est-elle déjà ouverte à tous ?",
          "L’application est en développement et son déploiement est progressif. L’accès est réservé à l’équipe et aux utilisateurs autorisés ; il n’est pas encore ouvert au public.",
        ],
      ],
    )}</section>
    ${invitation(site)}`;
}
