# 📊 Rapport de Fin de Projet — InvestX 💎
> **Simulateur Boursier Haute Performance & Analyse de Sentiment IA**

## 1. Introduction
InvestX est une plateforme de "Paper Trading" permettant aux utilisateurs de s'immerger dans les marchés financiers sans risque. Le projet repose sur une exigence de fiabilité bancaire (atomicité des transactions) et de réactivité (flux temps réel).

## 2. Stack Technologique (Fullstack)

### 🔹 Frontend (Interface Utilisateur)
- **React 18 & Vite** : Pour une interface ultra-rapide et un développement moderne.
- **TypeScript** : Garantit la robustesse du code et réduit les erreurs de runtime.
- **Tailwind CSS** : Design "Dark Mode" moderne, responsive et optimisé.
- **Lucide React** : Bibliothèque d'icônes vectorielles cohérente.
- **Axios** : Centralisation des appels API avec intercepteurs pour la gestion des jetons JWT.
- **Socket.io-client** : Réception des flux de prix en temps réel sans rafraîchissement.

### 🔹 Backend (Moteur Logiciel)
- **Node.js & Express** : Serveur asynchrone performant pour gérer des milliers de connexions simultanées.
- **Knex.js (Query Builder)** : Gestion fine des requêtes SQL et des transactions atomiques.
- **Socket.io** : Propulsion des prix en direct vers les clients via un système de "Rooms".
- **JWT (Json Web Token)** : Sécurité par double jeton (Access/Refresh) pour une session utilisateur robuste.

### 🔹 Données & Infrastructure
- **PostgreSQL** : Base de données relationnelle pour l'intégrité des données financières (Utilisation de `BIGINT` pour les IDs et `NUMERIC` pour la précision monétaire).
- **Redis** : Cache ultra-rapide (<1ms) pour stocker les cotations boursières et soulager la base de données.
- **Finnhub API** : Source de données boursières mondiales via WebSocket.

### 🔹 Intelligence Artificielle
- **Google Gemini 2.5 Flash** : Analyse de sentiment hybride (nettoyage local NLP + classification par IA) pour évaluer les actualités financières.

## 3. Architecture du Moteur de Trading
Le cœur du projet, le `OrderEngine`, implémente des concepts critiques :
1. **Atomicité SQL** : Toute transaction (achat/vente) est "tout ou rien". Si une étape échoue, le cash est restitué.
2. **Verrouillage Concurrentiel (`forUpdate`)** : Empêche la fraude ou les erreurs lors d'ordres simultanés (Race Conditions).
3. **Algorithme PUMP** : Calcul automatique du Prix Unitaire Moyen Pondéré pour un suivi précis de la performance.
4. **Gestion Multi-Devises** : Conversion dynamique des montants (USD/EUR/MAD) selon le profil utilisateur.

## 4. Conclusion
InvestX n'est pas qu'un simple site web, c'est une infrastructure logicielle complète qui respecte les standards de la FinTech : sécurité, performance et aide à la décision par l'IA.

---
*Rapport généré pour le projet InvestX - Juin 2026*