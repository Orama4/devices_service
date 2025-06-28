# devices_service

Ce dépôt est dédié à la **gestion** des dispositifs connectés, à leur **configuration**, ainsi qu’à leur **surveillance en temps réel** via une API REST construite avec Node.js.

## Fonctionnalités principales

- Création, modification, suppression de dispositifs
- Affectation de dispositifs à des utilisateurs
- Surveillance des états, mesures, alertes
- API REST pour l’administration des dispositifs
- Intégration avec MQTT pour la communication IoT

## Technologies utilisées

- **Node.js 20+**
- **Express.js** : Framework web minimaliste
- **mqtt.js** : Communication avec les brokers MQTT
- **dotenv** : Gestion des variables d’environnement
- **Nodemon** : Redémarrage automatique en développement

## Prérequis

- Node.js >= 20
- [npm](https://www.npmjs.com/)  pour la gestion des dépendances

## Installation

1. **Cloner le dépôt :**

   ```bash
   git clone <url_du_repo>
   cd devices_service
   ```

2. **Copier le fichier d’environnement :**

   ```bash
   cp .env.example .env
   ```

   Renseigner les variables nécessaires (ex. : `DATABASE_URL`).

3. **Installer les dépendances :**

   ```bash
   npm install
   ```

4. **Se connecter a la base de donnees : **

```bash
npx prisma db pull
npx prisma generate

## Lancement du projet

```bash
npm run dev
```

L'API sera accessible sur [http://localhost:5001](http://localhost:5001)

## Arborescence du projet

```
devices_service/
├── src/
│   ├── middlewares/           
│   ├── controllers/   # Logique métier
│   ├── routes/        # Routes Express
│   ├── services/      # Gestion MQTT, traitement des données
│   └── utils/         # Fonctions utilitaires
|   └── index.ts    # Point d’entrée principal
├── .env               # Variables d’environnement
├── .env.example       # Fichier modèle .env
├── package.json       # Dépendances et scripts
└── README.md
```

---

