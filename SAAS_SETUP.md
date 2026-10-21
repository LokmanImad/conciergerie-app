# Mise en service multi-société

Cette évolution transforme l'installation actuelle en socle SaaS multi-société. Elle conserve les données existantes et les rattache à la société initiale `Conciergerie Privée`.

## Ce qui est pris en charge

- une société isolée par `company_id` dans toutes les tables métier ;
- RLS Supabase par société, licence et module ;
- contrôle Super Administrateur dans `/plateforme` ;
- statut de société et suivi de licence ;
- activation indépendante du Web et du mobile ;
- activation des modules par société ;
- identité visuelle, coordonnées et informations légales ;
- rattachement des utilisateurs Clerk et rôles internes ;
- validation explicite de chaque nouvel utilisateur avant tout accès aux données ;
- inventaire des sous-domaines et domaines personnalisés ;
- politiques d'accès par appareil et registre d'appareils de confiance ;
- enrôlement Web/mobile et blocage RLS des appareils non approuvés ;
- isolation des photos d'identité, justificatifs de charges et contrats ;
- cohérence des relations pour empêcher une liaison entre deux sociétés.

## Migrations Supabase

Sauvegarder la base puis tester d'abord sur un projet Supabase de préproduction. Dans le SQL Editor, exécuter dans cet ordre après la migration 39 :

1. `scripts/40_saas_control_plane.sql`
2. `scripts/41_tenant_data_isolation.sql`
3. `scripts/42_tenant_aware_billing.sql`
4. `scripts/43_tenant_integrity_and_storage.sql`
5. `scripts/44_trusted_device_enforcement.sql`
6. `scripts/45_clerk_user_provisioning.sql`
7. `scripts/46_user_access_approval.sql`

Les deux comptes présents dans `app_admins` deviennent Super Administrateurs et propriétaires de la société initiale. Tous les modules, le Web et le mobile restent actifs pour cette société.

## Provisionnement automatique des utilisateurs

Après la migration 45, les sociétés et leurs utilisateurs se gèrent uniquement dans `/plateforme` :

1. **Nouvelle société** crée simultanément la société Supabase, son organisation Clerk, sa licence d'essai et sa configuration initiale.
2. **Utilisateurs → Envoyer l'invitation** crée une invitation Clerk à partir du nom, de l'e-mail et du rôle saisis.
3. L'utilisateur accepte l'invitation Clerk et choisit son propre mot de passe ; aucun mot de passe temporaire n'est transmis par l'application.
4. L'acceptation crée automatiquement le membre avec le statut `pending_approval`.
5. Tant qu'un Super Administrateur n'a pas cliqué sur **Autoriser**, le Web et le mobile affichent uniquement l'écran d'attente et les règles RLS refusent les données métier.
6. Les webhooks Clerk maintiennent le nom, l'e-mail, le rôle et le statut synchronisés.
7. La suspension depuis `/plateforme` retire l'accès à l'organisation Clerk et désactive immédiatement le membre dans Supabase.

Ajouter la variable serveur suivante dans Vercel et dans l'environnement local :

```text
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

Dans Clerk → **Webhooks**, créer un endpoint vers :

```text
https://votre-domaine/api/webhooks/clerk
```

Souscrire au minimum aux événements :

- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`
- `organizationInvitation.accepted`
- `organizationInvitation.revoked`
- `user.updated`
- `user.deleted`

Le webhook vérifie cryptographiquement chaque requête et traite les événements de manière idempotente. Dans Clerk, activer **Password** pour que l'invité choisisse son mot de passe, conserver la vérification e-mail souhaitée et configurer l'accès en mode invitation uniquement afin d'empêcher l'inscription publique.

## Clerk Organizations

Pour chaque nouvelle société :

1. créer une Organization dans Clerk ;
2. inviter ses utilisateurs dans cette Organization ;
3. copier l'identifiant `org_...` dans la fiche société de la plateforme ;
4. rattacher chaque identifiant Clerk `user_...` dans la boîte **Utilisateurs** de `/plateforme` ;
5. demander à l'utilisateur de sélectionner son organisation active dans sa session Clerk.

Un utilisateur doit être membre dans Clerk et dans `company_members`. Supabase lit l'organisation active du JWT Clerk et refuse les données des autres sociétés.

## Domaines

Le modèle accepte :

- un sous-domaine standard, par exemple `atlas.app.example.com` ;
- un domaine personnalisé, par exemple `gestion.conciergerie-atlas.ma`.

L'ajout dans `/plateforme` crée un enregistrement **en attente**. Le domaine ne doit passer à **vérifié** qu'après la configuration DNS, l'ajout du domaine chez l'hébergeur et la validation TLS. Le routage automatique par nom d'hôte n'est pas activé par les migrations de base : tant qu'il n'est pas installé, toutes les sociétés utilisent l'URL principale et l'organisation Clerk active détermine leur espace.

Les liens publics `/check-in/<token>` restent indépendants du domaine et ne demandent jamais de connexion au voyageur.

## Appareils autorisés

Trois politiques sont prévues :

- `any` : tout appareil authentifié est accepté ;
- `approved_only` : seuls les appareils enrôlés puis approuvés doivent être acceptés ;
- `certificate_required` : accès d'entreprise protégé par certificat ou passerelle Zero Trust.

Le mode `approved_only` est appliqué au Web, au mobile et aux règles RLS après la migration 44. Un secret aléatoire est conservé dans le navigateur ou dans SecureStore sur mobile ; seule son empreinte SHA-256 est enregistrée dans Supabase. Un nouvel appareil reste bloqué jusqu'à son approbation dans `/plateforme`.

Le mode certificat nécessite toujours une infrastructure externe, par exemple une passerelle avec mTLS. Une application Web ne peut pas lire de manière fiable le numéro de série ou l'adresse MAC d'un ordinateur.

## Avant d'ouvrir à un client externe

- appliquer et tester les sept migrations ;
- activer Clerk Organizations et vérifier les claims d'organisation ;
- tester deux sociétés avec des données distinctes ;
- vérifier qu'une société ne peut ni lire ni modifier les données ou fichiers de l'autre ;
- tester invitation, choix du mot de passe, attente d'approbation, autorisation, suspension, expiration, Web désactivé, mobile désactivé et modules désactivés ;
- configurer les sauvegardes et la journalisation ;
- déployer le Web et publier une nouvelle version mobile.
