# Conciergerie mobile

Application Expo / React Native réservée aux administrateurs de la conciergerie.

## Configuration

1. Copier `.env.example` vers `.env.local`.
2. Renseigner les quatre variables publiques Expo. `EXPO_PUBLIC_WEB_APP_URL` doit contenir l’adresse HTTPS de l’application web qui héberge le formulaire public.
3. Dans Clerk, activer **Native API** pour l'application existante.
4. Enregistrer les identifiants natifs :
   - iOS : `com.conciergerie.privee`
   - Android : `com.conciergerie.privee`

Ne jamais placer `CLERK_SECRET_KEY` ou `SUPABASE_SECRET_KEY` dans ce dossier.

## Démarrage

```bash
npm install
npm start
```

Scannez ensuite le QR code avec Expo Go. L'application utilise les mêmes comptes Clerk, la même base Supabase et les mêmes règles RLS que l'application web.

## Réservations mobiles

Le module permet de créer une réservation, consulter son détail, modifier le séjour et annuler le dossier sans supprimer son historique. Les conflits de dates et les règles de montants restent validés par Supabase.

Depuis le détail d’une réservation, l’agent peut aussi suivre le nombre d’adultes enregistrés, créer ou remplacer le lien sécurisé du formulaire voyageurs, le copier et le partager avec les applications installées sur le téléphone (WhatsApp, SMS, e-mail, etc.).

## Gestion des voyageurs

Le module Voyageurs comprend la recherche et le filtrage des dossiers, la consultation de chaque adulte, l’affichage sécurisé des documents d’identité et de la signature, la validation ou la demande de correction. Après validation, les fiches individuelles de police peuvent être imprimées ou générées en PDF et partagées depuis le téléphone.

## Gestion des charges

Le module Charges permet de consulter et filtrer les dépenses, afficher les totaux mensuels, créer ou modifier une charge et la relier à un appartement ou une réservation. Un justificatif peut être photographié ou choisi dans la galerie ; il est conservé dans un espace Supabase privé. Une annulation conserve l'historique et retire automatiquement la charge des calculs financiers.

Avant d'utiliser ce module, exécuter `scripts/35_mobile_charges_and_receipts.sql` dans l'éditeur SQL Supabase. Cette migration ajoute les champs d'audit, le stockage privé des justificatifs et les règles de calcul pour les charges annulées.

## Contrats propriétaires

Les contrats sont rédigés et imprimés depuis l'application web. L'application mobile permet ensuite de retrouver le dossier, photographier chaque page du contrat signé et cacheté, importer plusieurs pages depuis la galerie et consulter les scans privés.

Avant d'utiliser ce module, exécuter `scripts/36_owner_contracts.sql` dans l'éditeur SQL Supabase. Cette migration crée les contrats, leur historique documentaire et le stockage privé `owner-contracts`.

## Structure

```text
src/app/          Routes et navigation Expo Router
src/components/   Composants visuels réutilisables
src/features/     Types et règles par module métier
src/hooks/        Chargement des données Supabase
src/lib/          Configuration et clients externes
src/constants/    Thème et design tokens
```
