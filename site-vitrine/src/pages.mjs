import { escapeHtml as e, safeUrl } from "./html.mjs";
import { icon } from "./icons.mjs";
import { brandLogo } from "./brand.mjs";
import {
  button,
  contact,
  image,
  sectionLabel,
  faqList,
  cta,
} from "./presentation.mjs";
import { renderHomeExperience } from "./home-experience.mjs";
import { renderNavigation as header } from "./navigation.mjs";

export const services = [
  {
    slug: "gestion-locative",
    number: "01",
    name: "Gestion locative",
    short: "Votre tranquillité, notre métier.",
    icon: "key",
    description:
      "De la préparation de l’appartement au suivi des séjours, nous prenons soin de votre bien et de ceux qui y séjournent.",
    title: "Confiez les clés.",
    emphasis: "Gardez l’esprit libre.",
    image: "interior.webp",
    intro:
      "Un appartement, ce sont des détails à anticiper et une présence à assurer. Nous organisons votre gestion locative autour de votre bien, de vos attentes et de l’expérience de vos voyageurs.",
    steps: [
      [
        "Un appartement prêt à accueillir",
        "Nous échangeons sur le bien, ses équipements et vos objectifs pour définir ensemble une prise en charge adaptée.",
      ],
      [
        "Des séjours accompagnés",
        "Organisation des arrivées et départs, communication avec les voyageurs, coordination du ménage et de l’entretien selon la prestation convenue.",
      ],
      [
        "Un suivi lisible",
        "Nous faisons le point sur l’activité et les interventions pour vous permettre de suivre votre appartement avec sérénité.",
      ],
    ],
    faq: [
      [
        "Dans quelles villes gérez-vous des appartements ?",
        "Nous intervenons à Tanger, Tétouan et Asilah. Notre arrivée à Marrakech est en préparation.",
      ],
      [
        "Comment sont définis les frais de gestion ?",
        "Nous établissons une proposition selon votre bien et les services convenus. Contactez-nous pour étudier votre situation.",
      ],
      [
        "Puis-je vous confier un appartement déjà meublé ?",
        "Oui. Nous commençons par un échange sur son état, ses équipements et les éventuels ajustements à prévoir.",
      ],
    ],
  },
  {
    slug: "sous-location",
    number: "02",
    name: "Sous-location",
    short: "Une autre façon de louer.",
    icon: "house",
    description:
      "Étudions une formule de sous-location encadrée, avec des engagements et des conditions définis ensemble.",
    title: "Un bien confié.",
    emphasis: "Un cadre clair.",
    image: "terrace.webp",
    intro:
      "Vous souhaitez nous proposer votre appartement en sous-location ? Nous étudions sa localisation, son état et ses possibilités, puis nous discutons d’un cadre adapté avec vous.",
    steps: [
      [
        "Vous nous présentez votre bien",
        "Ville, quartier, surface, état et équipements : nous réunissons les informations utiles avant de poursuivre.",
      ],
      [
        "Nous étudions la collaboration",
        "Nous examinons les conditions de mise à disposition, les responsabilités de chacun et les modalités de suivi.",
      ],
      [
        "Nous formalisons les engagements",
        "Toute collaboration se construit sur un accord écrit précisant les autorisations, la durée, les montants et les conditions convenus.",
      ],
    ],
    faq: [
      [
        "Tous les appartements sont-ils acceptés ?",
        "Chaque bien fait l’objet d’une étude. Nous revenons vers vous après avoir pris connaissance de sa localisation et de ses caractéristiques.",
      ],
      [
        "Quelle différence avec la gestion locative ?",
        "En gestion locative, nous gérons le bien pour votre compte selon notre accord. En sous-location, les conditions d’occupation et de mise à disposition sont organisées dans un contrat spécifique.",
      ],
      [
        "Comment connaître les conditions proposées ?",
        "Présentez-nous votre appartement. Nous échangeons ensuite directement avec vous sur la formule envisageable.",
      ],
    ],
  },
  {
    slug: "achat-investissement",
    number: "03",
    name: "Achat & investissement",
    short: "Le bon projet commence ici.",
    icon: "building",
    description:
      "Un accompagnement pour acheter votre appartement et découvrir des projets neufs aux conditions attractives.",
    title: "Votre prochain bien.",
    emphasis: "Votre nouveau chapitre.",
    image: "architecture.webp",
    intro:
      "Résidence personnelle ou projet locatif : nous vous aidons à préciser votre recherche et à découvrir des opportunités correspondant à votre ville, votre budget et vos priorités.",
    steps: [
      [
        "Comprendre votre projet",
        "Nous précisons ensemble votre budget, vos critères et votre horizon d’achat pour orienter la recherche.",
      ],
      [
        "Explorer les opportunités",
        "Nous vous présentons les biens et programmes disponibles, avec leurs caractéristiques et les informations communiquées pour chaque projet.",
      ],
      [
        "Avancer avec les bonnes informations",
        "Nous facilitons les échanges et les visites. Pour le neuf, les prix, échéances et disponibilités sont à confirmer pour chaque programme.",
      ],
    ],
    faq: [
      [
        "Proposez-vous des appartements en construction ?",
        "Oui, nous accompagnons aussi des recherches dans des programmes en construction. Contactez-nous pour connaître les projets actuellement proposés.",
      ],
      [
        "Les offres en ligne sont-elles disponibles immédiatement ?",
        "La disponibilité et les conditions peuvent évoluer. Elles sont confirmées lors de votre échange avec notre équipe.",
      ],
      [
        "Pouvez-vous gérer mon bien après l’achat ?",
        "Nous pouvons étudier une prise en charge en gestion locative si le bien se situe dans une de nos villes d’intervention.",
      ],
    ],
  },
];

function footer(site) {
  const whatsapp = site.whatsapp.replace(/\D/g, "");
  return `<footer class="site-footer"><div class="footer-top wrap"><div><a class="brand brand-light" href="/">${brandLogo(site, "dark")}</a><p>Where hospitality roars.<br>L’attention, au quotidien.</p></div><div><h2>Votre projet</h2><a href="/gestion-locative">Confier mon appartement</a><a href="/sous-location">Proposer mon bien</a><a href="/achat-investissement">Acheter & investir</a><a href="/projets">Projets neufs</a></div><div><h2>Asad Hospitality</h2><a href="/a-propos">Notre approche</a><a href="/destinations">Nos destinations</a><a href="/#application">Notre application</a><a href="${e(site.appUrl)}" target="_blank" rel="noopener noreferrer">Espace de gestion ${icon("diagonal")}</a></div><div><h2>Faisons connaissance</h2>${site.email ? `<a href="mailto:${e(site.email)}">${e(site.email)}</a>` : ""}${site.phone ? `<a href="tel:${e(site.phone)}">${e(formatPhone(site.phone))}</a>` : ""}${whatsapp ? `<a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">Échanger sur WhatsApp ${icon("diagonal")}</a>` : ""}<p>Tanger · Tétouan · Asilah<br>Marrakech, prochainement</p></div></div><div class="footer-bottom wrap"><span>© ${new Date().getFullYear()} Asad Hospitality.</span><div><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a></div><span>Fait avec attention, au Maroc.</span></div></footer>`;
}

function formatPhone(phone) {
  return phone.replace(/^(\+212)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
}

function destinationCards(site, full = false) {
  return `<div class="destinations-grid ${full ? "destinations-full" : ""}">${site.destinations.map((city, index) => `<a class="destination-card ${city.available ? "" : "destination-soon"}" href="/destinations/${city.slug}" data-reveal>${image(city.image, `Ambiance architecturale et art de vivre — ${city.name}`)}<div class="destination-shade"></div><div class="destination-top"><span>0${index + 1}</span><span class="destination-status">${city.available ? "À vos côtés" : "Prochainement"}</span></div><div class="destination-bottom"><div><h3>${e(city.name)}</h3><p>${e(city.tagline)}</p></div><span class="round-arrow">${icon("diagonal")}</span></div></a>`).join("")}</div>`;
}

function appPreview() {
  return `<div class="app-preview" aria-label="Aperçu illustratif de l’application en développement"><div class="preview-bar"><span class="preview-dots"><i></i><i></i><i></i></span><span>ASAD · ESPACE DE GESTION</span><span class="preview-badge">En développement</span></div><div class="preview-body"><aside class="preview-sidebar"><span class="preview-monogram">A</span><span class="preview-active">${icon("house")}</span>${icon("key")}${icon("building")}${icon("mail")}</aside><div class="preview-main"><div class="preview-heading"><div><span class="mini-eyebrow">VOTRE QUOTIDIEN, SIMPLIFIÉ</span><h3>Tout commence ici.</h3></div><span class="preview-avatar">AH</span></div><div class="preview-metrics"><div><span>Réservations</span><strong>Tout voir ${icon("arrow")}</strong></div><div><span>Appartements</span><strong>Votre activité ${icon("house")}</strong></div></div><div class="preview-chart"><span>Votre activité, en perspective</span><div class="chart-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="chart-legend"><i></i> Un suivi centralisé</span></div><div class="preview-task">${icon("check")} Réservations, voyageurs et opérations<span>Au même endroit</span></div></div></div><p class="preview-caption">Aperçu illustratif · Interface susceptible d’évoluer</p></div>`;
}

function home(site) {
  return renderHomeExperience(site, services, appPreview());
}

function pageIntro(eyebrow, title, emphasis, description) {
  return `<section class="page-intro wrap">${sectionLabel(eyebrow)}<h1>${title}<br><em>${emphasis}</em></h1><p>${description}</p></section>`;
}

function servicePage(service) {
  return `${pageIntro(service.name.toUpperCase(), service.title, service.emphasis, service.intro)}<section class="wrap service-detail"><div class="detail-image">${image(service.image, "Ambiance d’un appartement et art de vivre au Maroc", "", true)}</div><div class="service-steps">${service.steps.map(([title, description], i) => `<article data-reveal><span>0${i + 1}</span><div><h2>${e(title)}</h2><p>${e(description)}</p></div></article>`).join("")}${button(service.slug === "achat-investissement" ? "Présenter mon projet d’achat" : "Présenter mon appartement", contact(service.slug))}</div></section><section class="section wrap faq-section"><div>${sectionLabel("EN TOUTE CLARTÉ")}<h2>Vos questions,<br><em>nos réponses.</em></h2></div>${faqList(service.faq)}</section>${service.slug === "achat-investissement" ? `<section class="wrap related-banner"><div><h2>Vous recherchez un programme neuf ?</h2><p>Découvrez notre rubrique dédiée aux projets en construction.</p></div>${button("Les projets neufs", "/projets")}</section>` : ""}${cta()}`;
}

function projectsPage(site) {
  const cards = site.projects
    .map((project) => {
      const picture = safeUrl(project.image);
      return `<article class="project-card" data-project-city="${e(project.city)}">${picture ? `<img src="${e(picture)}" alt="${e(project.name)}" width="800" height="600" loading="lazy">` : image("architecture.webp", "Photographie d’ambiance architecturale")}<div><span class="eyebrow">${e(project.city)} · ${e(project.status || "À découvrir")}</span><h2>${e(project.name)}</h2><p>${e(project.description)}</p>${project.priceLabel ? `<p class="project-price">${e(project.priceLabel)}</p>` : ""}${project.delivery ? `<p>Livraison prévisionnelle : ${e(project.delivery)}</p>` : ""}${button("Recevoir les détails", contact("achat-investissement", project.city))}</div></article>`;
    })
    .join("");
  return `${pageIntro("ACHAT & INVESTISSEMENT", "Votre prochain chapitre", "se construit ici.", "Des projets neufs en construction et des opportunités à étudier avec vous. Une sélection qui évolue, un accompagnement personnel.")}<section class="wrap projects-section">${site.projects.length ? `<div class="project-filters" role="group" aria-label="Filtrer les projets par ville"><button type="button" class="filter active" data-city-filter="all" aria-pressed="true">Toutes les villes</button>${[...new Set(site.projects.map((p) => p.city))].map((city) => `<button type="button" class="filter" data-city-filter="${e(city)}" aria-pressed="false">${e(city)}</button>`).join("")}</div><div class="projects-grid">${cards}</div><p class="image-disclaimer">Prix et disponibilités à confirmer. Les dates de livraison sont prévisionnelles.</p>` : `<div class="projects-empty"><div class="projects-empty-image">${image("architecture.webp", "Architecture contemporaine — photographie d’ambiance")}</div><div>${sectionLabel("UNE SÉLECTION QUI SE PRÉPARE")}<h2>Le bon projet<br><em>se choisit ensemble.</em></h2><p>Notre catalogue en ligne est en préparation. En attendant, présentez-nous votre recherche pour connaître les projets et les conditions actuellement proposés par notre équipe.</p>${button("Recevoir les opportunités", contact("achat-investissement"))}<p class="image-disclaimer">Photographie d’ambiance, sans lien avec un programme commercialisé.</p></div></div>`}</section>${cta("Parlons de vos critères.", "Une ville, un budget, une envie. Donnez-nous un point de départ pour explorer votre projet.")}`;
}

function destinationsPage(site) {
  return `${pageIntro("NOS DESTINATIONS", "Une présence locale.", "Une attention personnelle.", "Tanger, Tétouan et Asilah : trois villes, une même façon de prendre soin de votre projet. Marrakech nous rejoindra prochainement.")}<section class="wrap destinations-page">${destinationCards(site, true)}<p class="image-disclaimer">Photographies d’ambiance, sans représentation contractuelle d’un lieu ou d’un bien.</p></section>${cta()}`;
}

function cityPage(city) {
  return `${pageIntro(city.available ? "À VOS CÔTÉS AU MAROC" : "OUVERTURE PROCHAINE", city.name + ".", city.tagline, city.description)}<section class="wrap city-detail"><div class="detail-image">${image(city.image, `Photographie d’ambiance — ${city.name}`, "", true)}</div><div class="city-detail-copy">${city.available ? `<h2>Votre projet à ${e(city.name)}.</h2><p>Confier un appartement, proposer un bien en sous-location ou préparer un achat : choisissez le sujet qui vous intéresse et échangeons.</p><div class="city-services">${services.map((service) => `<a href="${contact(service.slug, city.name)}">${icon(service.icon)}${service.name}${icon("diagonal")}</a>`).join("")}</div>` : `<span class="status-badge"><span></span> BIENTÔT À MARRAKECH</span><h2>Un nouveau chapitre<br><em>se prépare.</em></h2><p>Nos services ne sont pas encore ouverts à Marrakech. Vous avez un projet dans la ville ? Laissez-nous vos coordonnées pour être informé de notre arrivée.</p>${button("Être informé de l’ouverture", contact("ouverture-marrakech", city.name))}`}</div></section>${cta()}`;
}

function aboutPage() {
  return `${pageIntro("L’ESPRIT ASAD", "L’hospitalité,", "une affaire d’attention.", "Nous accompagnons les propriétaires et les porteurs de projets immobiliers avec une idée simple : la confiance se construit dans les détails du quotidien.")}<section class="wrap about-grid"><div class="detail-image">${image("courtyard.webp", "Un patio et une architecture accueillante", "", true)}</div><div><h2>Proches de votre bien.<br><em>À l’écoute de votre projet.</em></h2><p>Asad Hospitality intervient à Tanger, Tétouan et Asilah. Notre activité réunit la gestion d’appartements, la sous-location et l’accompagnement à l’achat immobilier.</p><p>Nous privilégions les échanges directs et une organisation adaptée à chaque situation. Ce qui compte : comprendre vos attentes, expliquer notre approche et définir ensemble les engagements de la collaboration.</p><div class="approach-points"><span>${icon("check")} L’écoute avant la proposition</span><span>${icon("check")} La clarté dans les échanges</span><span>${icon("check")} Le soin des lieux et des personnes</span></div></div></section><section class="section wrap"><div class="section-heading"><div>${sectionLabel("UNE GESTION QUI AVANCE")}<h2>Le lien humain.<br><em>Les bons outils.</em></h2></div><p>Nous développons notre propre application pour faciliter le suivi des réservations, des voyageurs et des opérations, sur ordinateur et mobile.</p></div><div class="about-app-banner"><p>Notre application est en développement.<br>Découvrez ce que nous préparons.</p>${button("Découvrir l’application", "/#application")}</div></section>${cta()}`;
}

function contactPage(site) {
  return `${pageIntro("FAISONS CONNAISSANCE", "Un projet en tête ?", "Parlons-en.", "Dites-nous ce que vous recherchez. Notre équipe prendra connaissance de votre demande pour vous répondre personnellement.")}<section class="wrap contact-grid"><div class="contact-aside"><h2>Une conversation,<br><em>pour commencer.</em></h2><p>Propriétaire ou futur acquéreur, nous sommes à votre écoute.</p>${site.email ? `<a class="contact-method" href="mailto:${e(site.email)}"><span>E-MAIL</span><strong>${e(site.email)}</strong>${icon("diagonal")}</a>` : ""}${site.phone ? `<a class="contact-method" href="tel:${e(site.phone)}"><span>APPELEZ-NOUS</span><strong>${e(formatPhone(site.phone))}</strong>${icon("diagonal")}</a>` : ""}${site.whatsapp ? `<a class="contact-method" href="https://wa.me/${site.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noopener noreferrer"><span>WHATSAPP</span><strong>${e(formatPhone(site.whatsapp))}</strong>${icon("diagonal")}</a>` : ""}<div class="contact-local">${icon("pin")}<div>Tanger · Tétouan · Asilah<br><span>Marrakech, prochainement</span></div></div></div><form class="contact-form" data-contact-form novalidate><div class="form-heading"><span>VOTRE PROJET, EN QUELQUES MOTS</span><p>Les champs marqués d’un * sont obligatoires.</p></div><div class="form-grid"><label>Votre nom *<input name="name" autocomplete="name" required maxlength="120" placeholder="Nom et prénom"></label><label>Votre e-mail *<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="vous@exemple.com"></label><label>Téléphone<input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="+212 …"></label><label>Ville concernée *<select name="city" required><option value="">Choisir une ville</option>Tanger</option><option>Tétouan</option><option>Asilah</option><option value="Marrakech">Marrakech — prochainement</option><option>Autre</option></select></label></div><label>Votre besoin *<select name="subject" required><option value="">Choisir un sujet</option value="gestion-locative">Gestion de mon appartement</option><option value="sous-location">Sous-location de mon bien</option><option value="achat-investissement">Achat & projets neufs</option><option value="application">Lancement de l’application</option><option value="ouverture-marrakech">Ouverture à Marrakech</option><option value="autre">Une autre question</option></select></label><label>Votre message *<textarea name="message" rows="5" required minlength="15" maxlength="5000" placeholder="La localisation de votre bien, votre recherche, vos attentes…"></textarea></label><div class="form-trap" aria-hidden="true"><label>Votre site internet<input name="website" tabindex="-1" autocomplete="off"></label></div><label class="checkbox-label"><input type="checkbox" name="consent" required><span>J’accepte que mes informations soient utilisées pour répondre à cette demande. <a href="/confidentialite">En savoir plus</a>.</span></label><p class="form-status" role="status" aria-live="polite" data-form-status></p><button class="button button-primary" type="submit">Envoyer ma demande${icon("arrow")}</button><noscript><p>Activez JavaScript pour envoyer ce formulaire, ou contactez-nous directement par e-mail ou téléphone.</p></noscript></form></section>`;
}

function policyPage(site, privacy) {
return `${pageIntro(privacy ? "VOS INFORMATIONS" : "INFORMATIONS DU SITE", privacy ? "Votre vie privée," : "Mentions", privacy ? "avec attention." : "légales.", privacy ? "Cette page décrit le fonctionnement du formulaire et les informations transmises lorsque vous nous contactez." : "Les informations disponibles sur ce site et les moyens de contacter Asad Hospitality.")}<article class="wrap prose">${privacy ? `<h2>Les informations que vous nous confiez</h2><p>Le formulaire recueille votre nom, votre e-mail, votre téléphone si vous le renseignez, la ville concernée, le sujet et votre message. Ces informations servent à répondre à votre demande et à échanger sur votre projet.</p><h2>Transmission et destinataires</h2><p>Vos messages sont destinés à Asad Hospitality. Lorsque vous envoyez le formulaire, votre message est transmis à notre messagerie professionnelle par notre prestataire de messagerie. Le site est hébergé sur Vercel. Les liens WhatsApp ouvrent un service externe soumis à ses propres conditions.</p><h2>Navigation et cookies</h2><p>Le site vitrine n’intègre pas de cookies publicitaires ni d’outil de suivi d’audience. Les coordonnées saisies ne sont pas enregistrées dans le stockage local du navigateur.</p><h2>Vos demandes</h2><p>Pour toute question sur vos informations ou pour demander leur rectification ou leur suppression, contactez-nous à <a href="mailto:${e(site.email)}">${e(site.email)}</a>.</p>` : `<h2>Éditeur et contact</h2><p>Site de présentation d’Asad Hospitality, proposant des services de gestion locative, de sous-location et d’accompagnement immobilier à Tanger, Tétouan et Asilah. L’ouverture à Marrakech est en préparation.</p><p>Contact : <a href="mailto:${e(site.email)}">${e(site.email)}</a>${site.phone ? ` · <a href="tel:${e(site.phone)}">${e(formatPhone(site.phone))}</a>` : ""}.</p><h2>Informations commerciales</h2><p>Les prestations et conditions font l’objet d’une proposition et d’un accord spécifiques. Les informations concernant les programmes immobiliers, prix et disponibilités sont à confirmer auprès de notre équipe. Les dates de livraison mentionnées sont prévisionnelles.</p><h2>Photographies et application</h2><p>Les photographies d’ambiance ne constituent pas une présentation contractuelle de biens disponibles. L’aperçu de l’application est illustratif ; l’application est en développement et son accès est réservé aux utilisateurs autorisés.</p><h2>Hébergement</h2><p>Le déploiement du site est prévu sur Vercel. Le site vitrine est indépendant de l’application de gestion accessible sur le sous-domaine app.asadhospitality.ma.</p>`}</article>`;
}

export function getPages(site) {
  return [
    {
      path: "/",
      title: "Conciergerie & immobilier à Tanger, Tétouan et Asilah",
      description:
        "Asad Hospitality : gestion locative, sous-location et accompagnement à l’achat immobilier à Tanger, Tétouan et Asilah. Marrakech prochainement.",
      body: home(site),
    },
    ...services.map((service) => ({
      path: `/${service.slug}`,
      title: service.name,
      description: service.description,
      body: servicePage(service),
    })),
    {
      path: "/projets",
      title: "Projets neufs & opportunités immobilières",
      description:
        "Présentez votre recherche et découvrez les projets neufs en construction proposés par Asad Hospitality.",
      body: projectsPage(site),
    },
    {
      path: "/destinations",
      title: "Tanger, Tétouan, Asilah — nos destinations",
      description:
        "Découvrez nos villes d’intervention. Gestion locative, sous-location et immobilier au nord du Maroc. Marrakech prochainement.",
      body: destinationsPage(site),
    },
    ...site.destinations.map((city) => ({
      path: `/destinations/${city.slug}`,
      title: `${city.name} — ${city.available ? "Conciergerie & immobilier" : "Prochainement"}`,
      description: city.description,
      body: cityPage(city),
    })),
    {
      path: "/a-propos",
      title: "Notre approche",
      description:
        "Découvrez Asad Hospitality : une approche personnelle de la conciergerie et de l’accompagnement immobilier au Maroc.",
      body: aboutPage(),
    },
    {
      path: "/contact",
      title: "Parlons de votre projet",
      description:
        "Contactez Asad Hospitality pour confier votre appartement, proposer un bien en sous-location ou préparer votre achat immobilier.",
      body: contactPage(site),
    },
    {
      path: "/mentions-legales",
      title: "Mentions légales",
      description: "Informations et contact Asad Hospitality.",
      body: policyPage(site, false),
      noindex: true,
    },
    {
      path: "/confidentialite",
      title: "Confidentialité",
      description: "Informations sur le traitement de vos demandes de contact.",
      body: policyPage(site, true),
      noindex: true,
    },
    {
      path: "/404",
      title: "Page introuvable",
      description: "Cette adresse n’existe pas.",
      body: `${pageIntro("ERREUR 404", "Cette adresse", "reste à découvrir.", "La page que vous recherchez n’existe pas ou a changé d’adresse.")}<div class="wrap error-actions">${button("Revenir à l’accueil", "/")}</div>`,
      noindex: true,
    },
  ];
}

export function renderPage(site, page) {
  const canonical = new URL(page.path === "/404" ? "/" : page.path, site.url)
    .href;
return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#171714"><title>${e(page.title)} | Asad Hospitality</title><meta name="description" content="${e(page.description)}"><meta name="robots" content="${page.noindex ? "noindex,follow" : "index,follow"}"><link rel="canonical" href="${canonical}"><meta property="og:locale" content="fr_MA"><meta property="og:type" content="website"><meta property="og:site_name" content="Asad Hospitality"><meta property="og:title" content="${e(page.title)} | Asad Hospitality"><meta property="og:description" content="${e(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${site.url}/assets/interior.webp"><meta name="twitter:card" content="summary_large_image">${safeUrl(site.branding?.logoLight) ? `<link rel="icon" href="${e(safeUrl(site.branding.logoLight))}">` : ""}<link rel="preload" href="/assets/body.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/display.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/experience.css"><link rel="stylesheet" href="/assets/navigation.css"><script src="/assets/site.js" defer></script></head><body>${header(site, page.path)}<main id="contenu">${page.body}</main>${footer(site)}<a href="#contenu" class="back-top" aria-label="Retour en haut" data-back-top>${icon("arrow")}</a></body></html>`;
}
