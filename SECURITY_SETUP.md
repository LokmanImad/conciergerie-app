# Activation de la sécurité Clerk + Supabase

Le code de l'application transmet maintenant le jeton de session Clerk à Supabase. La migration SQL verrouille ensuite les données afin que seuls les deux administrateurs déclarés puissent les consulter ou les modifier.

## Avant de lancer la migration

1. Révoquer l'ancienne clé secrète Clerk si elle a été copiée dans un fichier ou partagée, puis placer la nouvelle clé uniquement dans `.env.local` et dans les variables de l'hébergement.
2. Dans Clerk Dashboard, ouvrir l'intégration Supabase et activer l'intégration native.
3. Copier le domaine Clerk fourni par cette intégration.
4. Dans Supabase Dashboard, ouvrir **Authentication > Sign In / Providers**, ajouter **Clerk**, puis coller ce domaine.
5. Vérifier que les deux comptes administrateurs sont toujours actifs dans Clerk.

## Appliquer la migration

1. Ouvrir `scripts/31_secure_clerk_admin_access.sql`.
2. Exécuter le script complet dans le SQL Editor de Supabase.
3. Se déconnecter puis se reconnecter à l'application avec chaque compte.

Les identifiants des deux comptes Clerk actuellement actifs sont déjà renseignés dans la migration.

## Vérifications

- Les deux comptes administrateurs voient les mêmes données et peuvent créer, modifier et supprimer.
- Une personne non connectée ne peut lire aucune table via la clé publique Supabase.
- Un compte Clerk absent de `app_admins` ne peut lire ni modifier les données.
- Les appels RPC de réservation, charge, portefeuille et paiement ne sont plus accessibles au rôle anonyme.

Ne jamais mettre `CLERK_SECRET_KEY`, une clé Supabase secrète ou un mot de passe dans un fichier de documentation ou dans Git.

## Activer les réservations et les voyageurs

Après la migration de sécurité, exécuter dans l'ordre :

1. `scripts/32_enhance_reservations.sql`
2. `scripts/33_travelers_and_police_forms.sql`
3. `scripts/34_identity_documents_and_police_pdf.sql`

Le formulaire voyageur public n'accorde aucun accès direct aux tables. Il passe par un jeton aléatoire limité dans le temps ; seule l'empreinte SHA-256 de ce jeton est conservée dans Supabase.

Pour permettre au serveur d'envoyer les photos dans le bucket privé, ajoutez également une variable serveur dans `.env.local` et dans Vercel :

```text
SUPABASE_SECRET_KEY=votre_cle_secrete_supabase
```

Vous pouvez aussi utiliser le nom `SUPABASE_SERVICE_ROLE_KEY` avec l'ancienne clé `service_role`. Cette variable ne doit jamais commencer par `NEXT_PUBLIC_` et ne doit jamais être copiée dans Git.
