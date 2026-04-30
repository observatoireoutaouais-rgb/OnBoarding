# Onboarding ODO Outaouais

Site d'intégration des nouveaux employés pour ODO Outaouais. Application
statique en HTML/CSS/JavaScript — aucune base de données, tout est stocké
dans le `localStorage` du navigateur.

## Fonctionnalités

- **Page d'accueil** — l'employé sélectionne son nom dans la liste
- **Parcours personnalisé** — étapes successives avec documents à cocher
- **Suivi automatique** — les étapes se complètent quand tous leurs documents sont cochés
- **Interface admin protégée par mot de passe** :
  - Ajouter / supprimer des employés
  - Créer, modifier, réorganiser, supprimer des étapes
  - Ajouter des documents (liens Drive, SharePoint, etc.) aux étapes
  - Exporter / importer / réinitialiser les données
- **Charte graphique ODO** — couleurs des 5 axes, polices Fraunces + Poppins

## Structure

```
onboarding-odo/
├── index.html        ← Page d'accueil (sélection employé)
├── employee.html     ← Parcours personnalisé
├── admin.html        ← Espace admin
├── css/styles.css
├── js/
│   ├── data.js       ← Couche de données (localStorage)
│   ├── app.js        ← Page d'accueil
│   ├── employee.js   ← Parcours
│   └── admin.js      ← Espace admin
├── render.yaml       ← Déploiement Render
├── package.json
└── README.md
```

## Configuration

### 1. Mot de passe admin

Ouvre `js/data.js` et modifie la constante :

```js
const ADMIN_PASSWORD = 'odo2026';   // ← change-moi
```

> ⚠️ **Note de sécurité** : ce mot de passe est en clair dans le JavaScript du
> client. Il bloque l'accès accidentel à l'interface admin, mais il n'est pas
> un mécanisme de sécurité fort. Comme l'app entière fonctionne dans le
> navigateur (`localStorage`), c'est acceptable pour un usage interne. Pour
> une vraie protection, il faudrait un backend.

### 2. Données par défaut

Au premier chargement, `js/data.js` crée 3 étapes d'exemple. Tu peux les
modifier ensuite via l'interface admin, ou modifier la fonction
`defaultData()` directement dans le code.

## Déploiement sur GitHub + Render

### A. Pousser sur GitHub

```bash
cd onboarding-odo
git init
git add .
git commit -m "Initial commit — onboarding ODO"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/onboarding-odo.git
git push -u origin main
```

### B. Déployer sur Render

1. Connecte-toi sur [render.com](https://render.com)
2. Clique **New +** → **Static Site**
3. Connecte ton dépôt GitHub `onboarding-odo`
4. Render détectera automatiquement `render.yaml`. Sinon, configure :
   - **Build Command** : *(laisse vide)*
   - **Publish Directory** : `.`
5. Clique **Create Static Site**

C'est tout. Render publiera automatiquement le site et le redéploiera à
chaque `git push` sur la branche `main`.

## Développement local

Tu peux ouvrir `index.html` directement dans le navigateur, ou utiliser un
serveur local :

```bash
# Avec Python
python3 -m http.server 3000

# Avec Node
npx serve .
```

Puis va sur `http://localhost:3000`.

## Sauvegardes

Comme les données sont dans le `localStorage` du navigateur, **elles sont
liées à ce navigateur précis**. Pour ne pas perdre la configuration des
étapes :

- Dans l'espace admin → onglet **Sauvegarde** → **Exporter (JSON)**
- Conserve le fichier dans un endroit sûr
- Tu peux le réimporter plus tard ou sur un autre poste

## Limites à connaître

- **Pas de partage entre navigateurs/appareils** : la progression d'un
  employé n'est visible que sur l'appareil où il l'a remplie.
- **Effacement des cookies = perte des données.**
- Pour un suivi centralisé multi-postes, il faudrait migrer vers une base
  de données (Supabase, Firebase, ou un petit backend Node + Render).

## Personnalisation rapide

| Quoi              | Où                                |
|-------------------|-----------------------------------|
| Couleurs          | `:root` dans `css/styles.css`     |
| Polices           | `<link>` Google Fonts dans les `*.html` |
| Mot de passe      | `ADMIN_PASSWORD` dans `js/data.js` |
| Étapes par défaut | `defaultData()` dans `js/data.js` |
| Logo              | `.brand-mark` dans `css/styles.css` |
