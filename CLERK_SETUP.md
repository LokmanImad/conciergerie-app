# Configuration Clerk - Instructions

## 1. Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec le contenu suivant :

```env
# Supabase Configuration (ajoutez vos clés existantes)
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_supabase

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_votre_cle_publique
CLERK_SECRET_KEY=sk_test_votre_cle_secrete

# Clerk URLs (optionnel - valeurs par défaut)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
```

## 2. Configuration dans Clerk Dashboard

1. Allez sur https://dashboard.clerk.com
2. Dans votre application, allez dans **Settings** → **Paths**
3. Assurez-vous que :
   - **Sign-in path**: `/sign-in`
   - **After sign-in redirect**: `/`

## 3. Désactiver le Sign-up (optionnel)

Si vous voulez désactiver complètement le sign-up :
1. Allez dans **Settings** → **User & Authentication**
2. Désactivez "Allow users to sign up"

## 4. Créer des utilisateurs manuellement

1. Allez dans **Users** dans le dashboard Clerk
2. Cliquez sur **Create user**
3. Entrez l'email et le mot de passe
4. L'utilisateur pourra se connecter avec ces identifiants

## 5. Redémarrer le serveur

Après avoir créé le fichier `.env.local`, redémarrez votre serveur de développement :

```bash
npm run dev
```

## Fonctionnalités implémentées

✅ Authentification avec Clerk
✅ Page de login uniquement (pas de signup)
✅ Protection de toutes les routes (sauf /sign-in)
✅ Bouton de connexion/déconnexion dans la sidebar
✅ Affichage du profil utilisateur dans la sidebar






