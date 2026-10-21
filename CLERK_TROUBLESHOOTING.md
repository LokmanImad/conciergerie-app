# Dépannage Clerk - Erreur 422

## Vérifications à faire :

### 1. Vérifier les variables d'environnement

Assurez-vous que votre fichier `.env.local` contient bien :

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_votre_cle_publique
CLERK_SECRET_KEY=sk_test_votre_cle_secrete
```

### 2. Vérifier dans Clerk Dashboard

1. Allez sur https://dashboard.clerk.com
2. Vérifiez que votre application est active
3. Vérifiez que les clés API correspondent à celles dans votre `.env.local`

### 3. Vérifier que l'utilisateur existe

1. Dans Clerk Dashboard → **Users**
2. Vérifiez qu'un utilisateur existe avec l'email que vous utilisez
3. Si l'utilisateur n'existe pas, créez-le manuellement

### 4. Vérifier la configuration de l'authentification

Dans Clerk Dashboard → **Settings** → **User & Authentication** :
- Vérifiez que "Email address" est activé comme méthode d'authentification
- Vérifiez que "Password" est activé

### 5. Redémarrer le serveur

Après avoir modifié `.env.local`, redémarrez toujours le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
```

### 6. Vérifier les logs

Regardez la console du navigateur (F12) pour voir les erreurs détaillées.

## Erreur 422 - Signification

L'erreur 422 signifie "Unprocessable Entity", ce qui indique généralement :
- Les données envoyées ne sont pas valides
- L'utilisateur n'existe pas
- Le format de l'email n'est pas correct
- Le mot de passe ne respecte pas les règles

## Solution rapide

1. Créez un utilisateur dans Clerk Dashboard avec l'email et le mot de passe que vous voulez utiliser
2. Assurez-vous que les variables d'environnement sont correctes
3. Redémarrez le serveur
4. Essayez de vous connecter






