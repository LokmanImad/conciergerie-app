# Architecture du projet

Le projet reste une application Next.js unique pendant la consolidation du produit. Les règles métier sont séparées de l'interface afin de pouvoir être réutilisées plus tard par l'application mobile.

```text
app/                         Routes et chargement des données Next.js
components/
  ui/                        Composants visuels génériques
  reservations/              Interface du module Réservations
features/
  reservations/              Types, constantes et validation métier partagés
lib/
  supabase/                  Accès authentifié à Supabase
scripts/                     Migrations SQL numérotées et rejouables
```

## Règles de structure

- `app/` orchestre les pages, mais ne contient pas les règles métier.
- `components/` contient uniquement la présentation et les interactions utilisateur.
- `features/` ne dépend pas de Next.js ni du navigateur. Ce code pourra être extrait dans un package partagé avec l'application mobile.
- La base de données applique également les règles critiques : contraintes de montants, dates et prévention des doubles réservations.
- Chaque évolution de schéma reçoit une migration SQL numérotée ; une migration déjà appliquée n'est pas modifiée rétroactivement.

## Application mobile

La version mobile se trouve dans `mobile/`. Elle utilise Expo Router, Clerk et la même base Supabase que l'application web. Le projet Next.js reste à la racine afin d'éviter une migration risquée des fichiers existants.

```text
mobile/
  src/app/                   Routes et navigation Expo Router
  src/components/            Interface mobile réutilisable
  src/features/              Types métier mobiles
  src/hooks/                 Chargement des données Supabase
  src/lib/                   Configuration Clerk et Supabase
```

Seules les clés publiques `EXPO_PUBLIC_*` sont présentes dans le client mobile. Les secrets Clerk et Supabase restent exclusivement sur le serveur web.

## Module voyageurs et fiches de police

- `features/travelers/` contient les types et les validations du domaine.
- `components/travelers/` contient le formulaire public, la signature et l'administration des dossiers.
- `app/voyageurs/` est le module protégé utilisé par les administrateurs.
- `app/check-in/[token]/` est le formulaire public sans compte destiné au voyageur principal.
- `app/api/check-in/[token]/` utilise uniquement des fonctions SQL limitées au dossier associé au jeton.
- `scripts/33_travelers_and_police_forms.sql` crée les tables, les règles RLS et les fonctions sécurisées.
- `scripts/34_identity_documents_and_police_pdf.sql` ajoute le bucket privé, les photos des pièces d'identité et l'accès aux fiches imprimables.

Le jeton public brut n'est jamais stocké dans la base : seule son empreinte SHA-256 est conservée. La signature est enregistrée au niveau du dossier comme signature du voyageur principal.

Les photos sont compressées dans le navigateur puis envoyées par une route serveur vers un bucket Supabase privé. L'OCR Tesseract.js s'exécute localement dans le navigateur et ne remplace jamais la vérification manuelle par un administrateur.

## Contrats, facturation et comptabilité

- `app/contrats/` gère la rédaction, l'impression et l'archivage des contrats propriétaires.
- `app/factures/` crée les factures depuis les réservations et suit leur règlement.
- `app/comptabilite/` consolide les revenus, encaissements, charges et commissions par mois.
- `app/proprietaires/releve/` génère un relevé mensuel imprimable pour chaque appartement.
- `features/invoices/` porte les types et les états métier des factures.
- `scripts/36_owner_contracts.sql` installe le stockage des contrats.
- `scripts/37_invoicing_and_accounting.sql` installe les paramètres de facturation, les factures, leurs lignes et les opérations sécurisées.
- `scripts/38_owner_invoices_and_rebillable_charges.sql` ajoute la décision de refacturation sur chaque charge et les factures mensuelles propriétaires.

## Tâches et rappels

- `app/taches/` fournit le planning partagé sur le web.
- `mobile/src/app/(app)/tasks/` fournit la liste, la création, la modification et le suivi sur mobile.
- `scripts/39_daily_tasks_and_reminders.sql` crée les tâches et synchronise automatiquement les check-in/check-out avec les réservations.
- Les tâches automatiques reçoivent un rappel 24 heures avant. Les tâches manuelles peuvent concerner la société sans appartement.
- Le mobile synchronise les rappels locaux au démarrage, au retour au premier plan et périodiquement.

## Mode SaaS multi-société

- `app/plateforme/` est le centre de contrôle réservé aux Super Administrateurs.
- `features/platform/` contient les types des sociétés, licences, modules et politiques d'accès.
- `scripts/40_saas_control_plane.sql` crée le plan de contrôle SaaS.
- `scripts/41_tenant_data_isolation.sql` rattache toutes les données métier à une société et remplace les anciennes politiques RLS.
- `scripts/42_tenant_aware_billing.sql` rend la facturation compatible avec plusieurs sociétés.
- `scripts/43_tenant_integrity_and_storage.sql` protège les relations et les fichiers privés contre les références entre sociétés.
- `scripts/44_trusted_device_enforcement.sql` ajoute l’enrôlement des appareils et inclut leur approbation dans les décisions RLS.
- `scripts/45_clerk_user_provisioning.sql` automatise les organisations, invitations et profils synchronisés avec Clerk.
- `scripts/46_user_access_approval.sql` sépare l'acceptation de l'invitation de l'autorisation d'accès aux données.
- `app/api/platform/` contient les opérations serveur Super Admin qui provisionnent Clerk sans exposer sa clé secrète au navigateur.
- `app/api/webhooks/clerk/` vérifie les signatures Clerk et réconcilie les utilisateurs dans Supabase.
- Le Web et le mobile lisent leurs droits à travers `get_current_entitlements`, qui centralise licence, plateforme, modules et identité visuelle.
- Le Web et le mobile interrogent d'abord `get_current_account_access` et restent sur un écran restreint tant que le membre est en attente, suspendu ou révoqué.

Le guide opérationnel complet se trouve dans `SAAS_SETUP.md`.
