# Onboarding ODO Outaouais — Version Firebase

Site d'intégration des nouveaux employés ODO Outaouais. Application
statique HTML/CSS/JS qui utilise **Firebase Firestore** comme base de
données partagée.

## ✨ Fonctionnalités

- **Données partagées en temps réel** — chaque modification est visible
  instantanément par tout le monde, sur tous les appareils
- **Page d'accueil** — l'employé sélectionne son nom dans la liste
- **Parcours personnalisé** — étapes successives avec documents à cocher
- **Mini-barre de progression par étape** — montre X/Y documents complétés
- **Commentaires** — chaque employé peut commenter chaque document et
  chaque étape; visibles par l'admin
- **Suivi automatique** — les étapes se complètent quand tous leurs
  documents sont cochés
- **Interface admin protégée par mot de passe**
- **Charte graphique ODO** — couleurs des 5 axes, polices Fraunces + Poppins

## 🔥 Configuration Firebase (à faire une seule fois)

### Étape 1 — Activer Firestore dans ton projet

1. Va sur la [console Firebase](https://console.firebase.google.com/)
2. Sélectionne ton projet existant
3. Dans le menu de gauche : **Build** → **Firestore Database**
4. Clique **Create database**
5. Choisis :
   - Mode : **Start in production mode** (on changera les règles juste après)
   - Région : `nam5 (us-central)` ou `northamerica-northeast1` (Montréal)
6. Clique **Enable**

### Étape 2 — Configurer les règles de sécurité (accès public)

Toujours dans Firestore → onglet **Rules**, remplace tout par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app/data {
      allow read, write: if true;
    }
  }
}
```

Clique **Publish**.

> ℹ️ Cette règle autorise tout le monde à lire/écrire sur le document
> `/app/data` uniquement. Pas de risque pour le reste de Firestore.

### Étape 3 — Récupérer la config web

1. Toujours dans la console Firebase → ⚙️ **Project settings** (en haut à gauche)
2. Onglet **General** → descends jusqu'à **Your apps**
3. Si pas d'app web : clique l'icône `</>` pour en créer une
   - Donne-lui un nom (ex. : `onboarding-odo`)
   - **Pas besoin** de cocher Firebase Hosting
   - Clique **Register app**
4. Tu vas voir un bloc `firebaseConfig` qui ressemble à ça :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "ton-projet.firebaseapp.com",
  projectId: "ton-projet",
  storageBucket: "ton-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Copie ces valeurs.**

### Étape 4 — Coller la config dans le code

1. Ouvre le fichier `js/data.js`
2. Trouve le bloc :
```javascript
const firebaseConfig = {
  apiKey: "TA_API_KEY",
  ...
};
```
3. Remplace par ta vraie config copiée à l'étape 3
4. Sauvegarde et commit

> 💡 Ces clés API sont **publiques par design** dans Firebase. Pas de
> souci à les avoir dans ton repo GitHub. La sécurité est gérée par les
> règles Firestore.

### Étape 5 — Autoriser ton domaine

Si tu utilises GitHub Pages :

1. Console Firebase → ⚙️ **Project settings** → onglet **General**
2. Scroll jusqu'à **Authorized domains** (peut être sous Authentication)
3. Si nécessaire, ajoute : `ton-username.github.io`

> Dans la plupart des cas, Firestore fonctionne sans cette étape pour les
> appels publics. À faire seulement si tu rencontres une erreur CORS.

## 📥 Importer tes données existantes

Si tu as déjà un export JSON depuis l'ancienne version :

1. Ouvre le site (Firebase doit être configuré)
2. Va dans l'espace admin
3. Onglet **Sauvegarde** → **Importer**
4. Sélectionne ton fichier JSON
5. Confirmer ✅

C'est tout : tes étapes ODO, tes employés et toutes tes données seront
maintenant dans Firebase et visibles par tout le monde.

## 🚀 Déploiement

### GitHub Pages (recommandé)

Pas de changement par rapport à avant. Pousse simplement les nouveaux
fichiers sur ton repo `main`. GitHub Pages redéploiera tout seul.

```bash
git add .
git commit -m "Migration vers Firebase"
git push
```

Attends 1-2 minutes puis rafraîchis ton site (Ctrl+Shift+R pour forcer).

## 🗂️ Structure

```
onboarding-odo/
├── index.html        ← Page d'accueil (sélection employé)
├── employee.html     ← Parcours personnalisé
├── admin.html        ← Espace admin
├── css/styles.css
├── js/
│   ├── data.js       ← Couche Firebase (à configurer !)
│   ├── app.js        ← Page d'accueil
│   ├── employee.js   ← Parcours
│   └── admin.js      ← Espace admin
└── README.md
```

## 🔑 Personnalisation

| Quoi              | Où                                     |
|-------------------|----------------------------------------|
| **Config Firebase** | `firebaseConfig` dans `js/data.js`   |
| Mot de passe admin | `ADMIN_PASSWORD` dans `js/data.js`    |
| Couleurs          | `:root` dans `css/styles.css`          |
| Polices           | `<link>` Google Fonts dans les `*.html` |
| Logo              | `.brand-mark` dans `css/styles.css`    |

## 💰 Coûts

Firebase a un **plan gratuit (Spark)** très généreux qui largement suffit
pour cet usage. Tu n'auras rien à payer.

Plan gratuit Firestore : 50 000 lectures, 20 000 écritures et 1 GB stockés
**par jour**. Pour un onboarding de quelques employés par semaine, tu
n'utiliseras que quelques pourcents de ces limites.

## 🛡️ Sécurité

Niveau actuel : **accès ouvert à tout le monde qui connaît l'URL du site.**

C'est acceptable pour un usage interne : ton site est sur GitHub Pages,
donc l'URL est publique mais pas publiquement promue. Le mot de passe
admin reste un garde-fou contre les modifications accidentelles.

Pour aller plus loin (futur) :
- Activer **Firebase Authentication** et restreindre l'accès aux comptes
  Google de l'organisation
- Utiliser des règles Firestore plus strictes basées sur l'auth

## 🔄 Différences avec la version localStorage

| Aspect | localStorage (avant) | Firebase (maintenant) |
|---|---|---|
| Données partagées | ❌ par navigateur | ✅ tout le monde voit la même chose |
| Persistance | ❌ perdues si cache effacé | ✅ stockées dans le cloud |
| Mode privé | ❌ tout disparaît | ✅ marche normalement |
| Cross-device | ❌ chaque appareil isolé | ✅ même données partout |
| Temps réel | ❌ rafraîchir manuellement | ✅ mises à jour live |
