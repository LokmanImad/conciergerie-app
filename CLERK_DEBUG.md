# Guide de débogage - Erreur "Couldn't find your account"

## Vérifications à faire dans Clerk Dashboard

### 1. Vérifier l'email exact
- Allez dans Clerk Dashboard → **Users**
- Trouvez votre utilisateur
- Vérifiez l'email exact (attention aux espaces, majuscules/minuscules)
- L'email doit correspondre **exactement** à celui que vous utilisez pour vous connecter

### 2. Vérifier que le compte a un mot de passe
- Cliquez sur l'utilisateur dans Clerk Dashboard
- Allez dans l'onglet **Security**
- Vérifiez qu'un mot de passe est configuré
- Si pas de mot de passe, vous devez le définir :
  - Cliquez sur "Reset password" ou "Set password"
  - Définissez un nouveau mot de passe

### 3. Vérifier la configuration d'authentification
Dans Clerk Dashboard → **Settings** → **User & Authentication** :

**Onglet "Email" :**
- ✅ "Sign-in with email" doit être **ON** (activé)
- ❌ "Sign-up with email" peut être OFF (désactivé)

**Onglet "Password" :**
- ✅ "Sign-up with password" peut être ON ou OFF (peu importe si vous créez les utilisateurs manuellement)
- Vérifiez les "Password requirements" (minimum 8 caractères par défaut)

### 4. Vérifier que le compte est actif
- Dans Clerk Dashboard → **Users**
- Vérifiez que le statut de l'utilisateur est "Active" (pas "Banned" ou autre)

### 5. Vérifier les variables d'environnement
Assurez-vous que votre `.env.local` contient les **bonnes** clés :
- Les clés doivent correspondre à votre application Clerk
- Vérifiez dans Clerk Dashboard → **API Keys** que vous utilisez les bonnes clés

### 6. Test avec l'email exact
- Copiez l'email exact depuis Clerk Dashboard
- Collez-le dans le formulaire de connexion (sans espaces)
- Utilisez le mot de passe que vous avez défini dans Clerk

## Solutions courantes

### Problème : Email avec espaces
**Solution :** Utilisez `.trim()` (déjà fait dans le code) ou copiez-collez l'email depuis Clerk

### Problème : Pas de mot de passe configuré
**Solution :** 
1. Dans Clerk Dashboard → Users → Cliquez sur l'utilisateur
2. Allez dans "Security" ou "Password"
3. Cliquez sur "Reset password" ou "Set password"
4. Définissez un mot de passe

### Problème : Mauvaises clés API
**Solution :**
1. Allez dans Clerk Dashboard → **API Keys**
2. Copiez la **Publishable Key** (commence par `pk_test_...`)
3. Copiez la **Secret Key** (commence par `sk_test_...`)
4. Mettez à jour votre `.env.local`
5. Redémarrez le serveur

### Problème : Compte créé sans méthode d'authentification
**Solution :**
1. Dans Clerk Dashboard → Users → Cliquez sur l'utilisateur
2. Vérifiez que l'email est vérifié (icône verte)
3. Vérifiez qu'un mot de passe est configuré
4. Si nécessaire, réinitialisez le mot de passe

## Test rapide

1. Créez un **nouveau** utilisateur dans Clerk Dashboard avec :
   - Email : `test@example.com`
   - Mot de passe : `Test1234!` (minimum 8 caractères)
2. Essayez de vous connecter avec ces identifiants
3. Si ça fonctionne, le problème vient de l'utilisateur existant
4. Si ça ne fonctionne pas, le problème vient de la configuration Clerk






