# Asad Hospitality — site vitrine

Site indépendant de l’application privée. Pages HTML générées, CSS et JavaScript légers, photographies et polices servies localement. Nodemailer est utilisé uniquement côté serveur pour le formulaire SMTP. Le dossier `dist/` est généré et ignoré par Git.

## En local

Depuis `site-vitrine/` :

```powershell
npm ci
npm run dev
```

Ouvrir `http://127.0.0.1:4173`. Le serveur reconstruit au démarrage ; après modification, redémarrer ou lancer `npm run build`, puis actualiser le navigateur. Le port est configurable par la variable `PORT`.

```powershell
npm run check
npm run build
```

Pour relancer le contrôle visuel automatique, démarrer le serveur puis exécuter `node scripts/preview-check.mjs` dans un deuxième terminal. Il utilise une installation locale de Chrome ; renseigner `BROWSER_EXECUTABLE` si son chemin diffère. Le contrôle couvre neuf pages à cinq largeurs d’écran et conserve les captures dans un dossier temporaire.

## Modifier le contenu

- `content/site.json` : coordonnées, titre d’accueil, villes, projets.
- `src/pages.mjs` : textes des services, pages, FAQ et mise en page.
- `src/home-experience.mjs` : composition éditoriale de l’accueil, collection de services, collage, destinations et invitation de contact.
- `src/presentation.mjs` : composants HTML partagés (liens, boutons, images, FAQ et appels à l’action).
- `src/navigation.mjs` : barre flottante, liens directs et menu secondaire compact partagé par toutes les pages.
- `public/assets/site.css` : styles de base et adaptation responsive.
- `public/assets/brand.css` : identité Asad Hospitality, palette sable/noir/doré, présentation immersive et cadrage des logos.
- `public/assets/experience.css` : compositions de la version éditoriale, transitions et adaptation responsive de l’expérience. Les animations respectent la préférence de réduction des mouvements.
- `public/assets/navigation.css` : navigation à liens directs sur ordinateur, panneau « Plus » pour les rubriques secondaires et petit menu déroulant sur mobile. Le panneau ne masque pas toute la page et ne bloque pas son défilement. Il se ferme avec Échap, un clic extérieur ou lorsque le focus le quitte. Une navigation sans JavaScript reste disponible.
- `public/assets/` : logos officiels fournis par Asad Hospitality, images et polices locales. Les photographies initiales sont des visuels d’ambiance, pas des biens commercialisés.

Les fichiers de logo originaux sont conservés sans modification. Pour remplacer les deux variantes, utiliser `node scripts/import-logos.mjs "chemin/du-logo-clair.jpg" "chemin/du-logo-transparent.png"` puis reconstruire le site. La configuration `branding` de `content/site.json` pointe vers les deux fichiers importés. Leur affichage est cadré en CSS pour conserver une marque lisible malgré les grandes marges des images carrées.

Le catalogue `projects` est volontairement vide. Pour publier un projet vérifié, ajouter un objet tel que celui-ci avec ses vraies données :

```json
{
  "name": "Nom réel du programme",
  "city": "Tanger",
  "status": "En construction",
  "description": "Présentation vérifiée du programme",
  "image": "/assets/nom-du-programme.webp",
  "priceLabel": "Prix communiqué et conditions réelles",
  "delivery": "Date prévisionnelle confirmée par le promoteur"
}
```

Les filtres de ville apparaissent automatiquement dès que des projets existent. Le site ne fournit pas encore de CMS ni d’interface d’administration : le contenu se modifie dans ces fichiers et se publie via Git/Vercel.

## Formulaire

Les liens e-mail, téléphone et WhatsApp fonctionnent immédiatement avec les coordonnées publiques. Le formulaire utilise une fonction Vercel et votre messagerie professionnelle via **SMTP**, sans compte Resend.

### Paramètres de la messagerie

Dans **cPanel → Email Accounts → info@asadhospitality.ma → Connect Devices**, relever le **serveur sortant** dans « Secure SSL/TLS Settings ». Utiliser exactement ce nom d’hôte ; ne pas déduire le serveur du domaine du site. Le mot de passe demandé est celui de la boîte mail, pas celui du compte cPanel. Ne pas le transmettre dans une conversation.

Copier `.env.example` vers `.env.local` dans `site-vitrine/` si ce fichier n’existe pas déjà, puis compléter :

```text
SMTP_HOST=serveur-sortant-indique-par-votre-hebergeur
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@asadhospitality.ma
SMTP_PASSWORD=mot-de-passe-de-la-boite-mail
CONTACT_FROM_EMAIL=info@asadhospitality.ma
CONTACT_TO_EMAIL=info@asadhospitality.ma
```

Ce bloc est un exemple à compléter, pas un jeu d’identifiants fonctionnels. Le port **465** utilise TLS dès la connexion (`SMTP_SECURE=true`). Si votre fournisseur indique **587**, utiliser `SMTP_SECURE=false` : le code exige alors STARTTLS avant de poursuivre. Les connexions sans chiffrement et les certificats invalides ne sont pas acceptés. Ne pas désactiver la vérification du certificat pour contourner une erreur : demander le bon serveur à l’hébergeur.

`CONTACT_FROM_EMAIL` et `CONTACT_TO_EMAIL` attendent une seule adresse simple, sans nom ni chevrons. L’expéditeur doit être autorisé par le serveur SMTP, généralement la même adresse que `SMTP_USER`. Le visiteur est placé en **Reply-To** : « Répondre » dans votre messagerie lui répondra directement. Le formulaire ne peut pas modifier le destinataire ou l’expéditeur configurés.

Dans `.env.local`, encadrer le mot de passe de guillemets compatibles s’il contient `#` ou des espaces. Dans l’interface Vercel, saisir sa valeur brute, sans guillemets ajoutés. `.env.local` est ignoré par Git ; aucun de ces paramètres ne doit recevoir un préfixe `PUBLIC_` ou `NEXT_PUBLIC_`.

### Vérifier sans envoyer d’e-mail

```powershell
npm run smtp:verify
```

Cette commande contrôle la configuration, la résolution du serveur, la connexion chiffrée et l’authentification, **sans envoyer de message**. Elle n’affiche pas le mot de passe ou les réponses privées du serveur. Elle ne prouve pas que l’expéditeur sera accepté ni qu’un message arrivera dans la boîte de réception : une soumission réelle du formulaire reste nécessaire après configuration. Les tests automatiques utilisent des transports simulés ou en mémoire et n’envoient aucun e-mail.

Pour tester localement, redémarrer `npm run dev` après modification de `.env.local`. Dans le **projet Vercel du site vitrine** (Root Directory : `site-vitrine`), ajouter les mêmes variables serveur dans **Settings → Environment Variables**, pour l’environnement souhaité, puis redéployer. Les paramètres du projet de l’application privée ne sont pas partagés automatiquement.

Le serveur confirme le succès uniquement après acceptation du message par le serveur SMTP pour le destinataire prévu. Cette acceptation ne garantit pas son classement en boîte de réception. Sans configuration valide ou si l’envoi échoue, le formulaire affiche une indisponibilité et propose les contacts directs. Les journaux serveur ne contiennent que des noms de variables ou des codes d’erreur techniques, jamais les identifiants, le contenu du message ou la réponse brute du fournisseur.

Avant publication, vérifier la réception dans `info@asadhospitality.ma` (y compris les indésirables), les quotas d’envoi et les réglages SPF/DKIM/DMARC de votre fournisseur. Conserver les enregistrements de messagerie existants lors de la configuration DNS de Vercel. Si l’hébergeur bloque les connexions SMTP externes depuis Vercel, lui demander l’accès au port sécurisé indiqué ou utiliser un autre fournisseur SMTP.

Validation serveur, limite de taille, champ anti-robot et refus des requêtes navigateur provenant d’un autre site sont intégrés. Le bouton d’envoi est bloqué pendant une soumission. Un identifiant de message stable aide à retrouver les tentatives, mais **SMTP ne garantit pas la déduplication**, notamment si le serveur accepte un message puis perd la connexion avant de confirmer. Avant une campagne à fort trafic, configurer une limitation de débit sur `/api/contact` dans le pare-feu Vercel ou ajouter un service de protection contre les robots. La limitation doit utiliser un stockage partagé si elle est implémentée dans le code serveur.

Les variables optionnelles `PUBLIC_CONTACT_EMAIL`, `PUBLIC_CONTACT_PHONE` et `PUBLIC_WHATSAPP_NUMBER` remplacent les coordonnées au build. Pour les utiliser localement, copier `.env.example` en `.env.local` et renseigner les valeurs.

## Déploiement Vercel, dans le même dépôt GitHub

Créer un **deuxième projet Vercel** connecté au dépôt actuel :

| Paramètre | Valeur |
| --- | --- |
| Root Directory | `site-vitrine` |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x ou supérieur |

Le fichier `vercel.json` fixe la configuration, les URL propres et les en-têtes de sécurité. Ne pas ajouter les clés Clerk/Supabase de l’application au site vitrine.

Tester l’adresse temporaire Vercel, puis ajouter `www.asadhospitality.ma` au **projet du site vitrine**. Ajouter également `asadhospitality.ma` avec une redirection vers `www.asadhospitality.ma`. Utiliser les enregistrements DNS exacts affichés par Vercel ; conserver les MX/TXT de la messagerie et le CNAME `app` existant. L’application privée reste sur son projet et `app.asadhospitality.ma`.

Le projet existant conserve sa racine. Le `tsconfig.json` racine exclut `site-vitrine/` pour éviter d’y analyser les fichiers du site.

## Avant publication publique

- Relire les textes et remplacer les photographies d’ambiance si vous disposez de photos propres à vos biens/villes.
- Compléter les mentions légales avec la raison sociale, l’adresse, les identifiants de l’entreprise et les autres informations applicables ; ces données n’ont pas été inventées.
- Compléter les informations de confidentialité avec vos durées de conservation et modalités réelles de traitement.
- Tester la réception du formulaire et le numéro WhatsApp.
- Vérifier les conditions de votre abonnement d’hébergement pour l’usage commercial.

Les sources et licences des ressources visuelles et typographiques sont décrites dans `ASSETS.md`.
