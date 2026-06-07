# 💎 InvestX — Simulateur de Trading Haute Performance

InvestX est une plateforme de "Paper Trading" (simulation boursière) moderne permettant de s'initier aux marchés financiers avec un capital virtuel de **100 000 $**. Le projet intègre des flux temps réel, une rigueur bancaire sur les transactions et une analyse de sentiment assistée par l'IA.

## 🚀 Fonctionnalités Clés

- **Moteur de Trading Atomique** : Gestion des ordres au marché (Market) et limites (Limit) avec calcul automatique du PUMP (Prix Unitaire Moyen Pondéré).
- **Flux Temps Réel** : Cotations en direct via WebSockets (Finnhub) et Socket.io.
- **Analyse de Sentiment IA** : Pipeline NLP local et classification via **Google Gemini 2.5 Flash** pour évaluer les actualités financières.
- **Tableau de Bord Admin** : Audit global des transactions, gestion des utilisateurs et statistiques de volume.
- **Sécurité Robuste** : Authentification par double jeton (JWT Access/Refresh) et gestion des rôles (Client, Admin, SuperAdmin).

## 🛠️ Stack Technique

**Frontend:**
- React 18 (Vite) / TypeScript
- Tailwind CSS / Lucide Icons
- Axios (Centralisation API) / Socket.io-client

**Backend:**
- Node.js / Express
- PostgreSQL (Persistance & Intégrité)
- Redis (Cache ultra-rapide pour les cotations)
- Knex.js (Query Builder & Transactions)
- Google Gemini SDK (IA)

## 📂 Structure du Projet

```text
investx_X/
├── backend/                # API Node.js
│   ├── src/
│   │   ├── config/         # DB, Redis, Socket, Init
│   │   ├── controllers/    # Logique des routes
│   │   ├── services/       # Moteur d'ordres, IA, Portefeuille
│   │   └── workers/        # Workers Finnhub & Devises
│   └── scripts/            # Scripts d'initialisation Admin
└── frontend/               # React App
    ├── src/
    │   ├── app/            # Composants, Pages, Contextes
    │   └── services/       # Client API centralisé
```

## ⚙️ Installation et Démarrage

### Prérequis
- Node.js (v20+)
- PostgreSQL & Redis installés

### Backend
1. Accédez au dossier : `cd backend`
2. Installez les dépendances : `npm install`
3. Configurez le fichier `.env` (voir `.env.example`)
4. Lancez le serveur : `npm run dev`

### Frontend
1. Accédez au dossier : `cd frontend`
2. Installez les dépendances : `npm install`
3. Lancez l'application : `npm run dev`

## 🛡️ Sécurité & Performance

- **Transactions SQL** : Utilisation du verrouillage concurrentiel (`forUpdate`) pour empêcher les erreurs de solde lors d'ordres simultanés.
- **Résilience Cache** : Basculement automatique (fallback) si Redis est indisponible.
- **Soft Delete** : Suppression logique des utilisateurs pour conserver l'historique d'audit.

---
*Projet réalisé dans le cadre du cursus Ynov Campus.*