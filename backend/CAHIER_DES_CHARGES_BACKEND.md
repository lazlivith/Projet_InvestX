# 📖 Cahier des Charges Backend Exhaustif — InvestX 💎
> **Documentation technique complète des fonctionnalités, algorithmes et services du backend**
> *Rédigé pour l'évaluation académique, l'audit technique et la conformité fonctionnelle*

---

## 1. Introduction et Spécifications Générales
Le backend d'**InvestX** est une infrastructure haute-performance conçue en **Node.js, Express et Knex.js**, connectée à une base de données **PostgreSQL** relationnelle et un cache **Redis** en mémoire. 

Ce backend agit en tant que moteur de trading et d'analyse financière temps réel. Chaque utilisateur dispose d'un portefeuille de démonstration crédité de **100 000,00 USD** de capital virtuel pour s'initier aux marchés financiers sans risque.

---

## 2. Architecture Logicielle
Le backend suit les principes du Clean Architecture structuré en couches pour assurer la maintenabilité, l'extensibilité et la testabilité du code :

1. **Couche Routeur / HTTP (Express)** : Déclare et expose les points d'entrée REST de l'API publique et sécurisée.
2. **Couche Contrôleurs (Controllers)** : Réceptionne les requêtes HTTP, valide les paramètres d'entrée, appelle les services métiers correspondants, et formalise les réponses JSON.
3. **Couche Middlewares** : Intercepte les requêtes pour appliquer les règles de sécurité globale (filtre CORS, en-têtes Helmet, extraction et vérification de jetons d'accès JWT, validation de rôles).
4. **Couche Services Métier (Services)** : Contient l'intelligence d'application (moteur d'exécution des transactions boursières, gestion de la résilience réseau, pipeline d'analyse NLP local, et liaisons SDK IA Gemini).
5. **Couche Dépôt / Accès aux Données (Repositories)** : Isole les requêtes SQL SQL/Knex.js. C'est la seule couche habilitée à lire et écrire dans la base de données PostgreSQL.
6. **Couche Workers en Tâche de Fond (Workers)** : Exécute des scripts asynchrones permanents (souscription continue au flux boursier mondial Finnhub par WebSocket).

---

## 3. Description des Fonctionnalités Implémentées

### 🔐 3.1. Gestion de la Sécurité, Identités & Rôles
Ce module protège l'accès à la plateforme et isole strictement l'espace d'administration du tableau de bord client :

*   **Inscription Sécurisée (Register)** :
    *   Validation d'unicité de l'adresse e-mail.
    *   Hashage cryptographique unilatéral du mot de passe avec `bcrypt` (10 rounds de salage).
    *   **Atomicité à la création** : Une transaction Knex.js garantit que l'utilisateur n'est inséré en base que si son portefeuille virtuel associé est créé avec succès avec son solde de **100 000,00 USD** (table `wallets`).
*   **Système de Double Jeton (JWT - Access & Refresh Tokens)** :
    *   `accessToken` : Jeton signé à durée courte (15 minutes), transmis dans les en-têtes HTTP (`Authorization: Bearer <token>`) pour authentifier les requêtes courantes.
    *   `refreshToken` : Jeton signé à durée longue (7 jours), stocké par le client et utilisé pour renouveler le jeton d'accès de manière invisible et sécurisée.
*   **Protection des Routes et Rôles** :
    *   Middleware `authenticateToken` : Vérifie l'intégrité de la signature JWT et rejette les requêtes invalides ou expirées avec un code `401 Unauthorized`.
    *   Middleware `requireAdmin` : Intercepte les jetons valides et restreint l'accès aux seules identités ayant la colonne `role` définie sur `'admin'` (renvoie un `403 Forbidden` pour les clients).

---

### 💼 3.2. Le Moteur de Trading Transactionnel (Order Engine)
C’est le cœur financier du système. Il exécute les ordres d'achat et de vente au marché de manière instantanée tout en appliquant les règles de rigueur bancaire :

*   **Mapping Haute-Fidélité de la Base de Données (Laravel Schema Mappings)** :
    *   Table des soldes : `wallets` (colonne `cash_available` représentant l'encours disponible).
    *   Table des lignes de titres possédés : `positions` (colonne `average_purchase_price` représentant le coût historique moyen).
    *   Génération automatique des clés primaires via UUIDs côté Node.js (`crypto.randomUUID()`) lors de l'insertion dans `users`, `wallets`, `positions` et `orders`.
*   **Vérification de Solvabilité Stricte** :
    *   À l'achat, le moteur multiplie le prix unitaire d'offre (ASK) par la quantité demandée. Si le coût total excède le montant `cash_available` de l'utilisateur, l'ordre est immédiatement refusé (renvoie un code HTTP `422`).
    *   À la vente, le moteur vérifie si l'utilisateur possède l'actif dans la table `positions` et en quantité suffisante.
*   **Atomicité Absolue (Transactions SQL Knex)** :
    *   Les écritures (mise à jour du solde cash, insertion/modification de l'actif, journalisation de l'ordre d'origine et de la transaction d'exécution) sont groupées dans un unique bloc transactionnel. Si une étape échoue (ex: crash du serveur, contrainte de base enfreinte), **l'intégralité de l'opération est annulée (rollback)**, garantissant une intégrité parfaite à la base de données.
*   **Verrouillage Concurrentiel (forUpdate)** :
    *   Lors de la lecture du portefeuille, la ligne de l'utilisateur est verrouillée en base via `.forUpdate()`. Cela empêche un utilisateur malveillant de lancer 10 requêtes d'achat simultanées pour vider son compte bien au-delà de son cash disponible (attaques de type Race Conditions / Double-Dépense).
*   **Algorithme Mathématique du PUMP (Prix Unitaire Moyen Pondéré)** :
    *   Lors d'achats cumulés d'une même action à des prix différents, le moteur calcule la moyenne pondérée pour évaluer la rentabilité future du trader :
        $$\text{PUMP} = \frac{(\text{PUMP Actuel} \times \text{Quantité Actuelle}) + (\text{Prix d'Achat} \times \text{Quantité Achetée})}{\text{Quantité Totale}}$$
    *   À la vente partielle, le prix d'achat moyen historique (PUMP) reste inchangé. À la vente totale (quantité finale = 0), la ligne d'actif est entièrement nettoyée de la table `positions` pour optimiser l'espace en base de données.

---

### ⏱️ 3.3. Module Temps Réel et Cache Résilient
InvestX simule un marché en constante effervescence en connectant le backend aux flux mondiaux réels :

*   **Worker d'Écoute Finnhub WebSocket** :
    *   Connexion asynchrone permanente aux serveurs WebSocket de Finnhub.
    *   Abonnement automatique aux actions de démonstration au démarrage : Apple (`AAPL`), Microsoft (`MSFT`), Amazon (`AMZN`), Google (`GOOGL`), et Tesla (`TSLA`).
*   **Simulation de Spread Bancaire (BID / ASK / LAST)** :
    *   Finnhub envoyant le prix de la dernière transaction (`last`), le worker applique une marge bancaire de $0.05\%$ ($0.0005$) pour générer en temps réel :
        *   Le prix de la demande (prix d'achat client) : $\text{ASK} = \text{last} \times 1.0005$
        *   Le prix de l'offre (prix de vente client) : $\text{BID} = \text{last} \times 0.9995$
*   **Caching Ultra-Rapide Redis** :
    *   Les prix d'offre et de demande sont écrits dans Redis sous la clé `quote:<TICKER>`.
    *   L'Order Engine lit le prix sur Redis, évitant les requêtes HTTP lentes et garantissant des exécutions d'ordre en **moins d'une milliseconde**.
*   **Résilience Transparente du Cache** :
    *   Si le serveur Redis est déconnecté, le `quoteService` détecte l'état du client (`redisClient.isReady`). Il contourne immédiatement la file d'attente Redis pour basculer sur des cotations de secours sans bloquer ou geler l'application Node.js.
*   **Propulsion Sélective Socket.io** :
    *   Couplage d'Express et du serveur HTTP natif de Node pour lier Socket.io.
    *   Système d'abonnement par salon (`socket.join(ticker)`) permettant au client React de s'abonner uniquement à l'action qu'il consulte à l'écran, optimisant l'usage de la bande passante.

---

### 🤖 3.4. Module IA & Analyse Sentiment NLP (Bonus B)
Le backend intègre une chaîne d'analyse quantitative textuelle conçue pour évaluer les actualités financières (signal d'aide à la décision) :

*   **Pipeline NLP Local (JavaScript)** :
    *   Pour éviter les intégrations triviales (envoi brut d'un texte à un LLM), le backend réalise un nettoyage linguistique local :
        1.  **Normalisation** : Passage du texte en minuscules.
        2.  **Nettoyage lexical** : Élimination de la ponctuation, des symboles spéciaux et des chiffres par expressions régulières (`/[^\w\s]/g`).
        3.  **Tokenisation** : Découpage sémantique en jetons (tokens) de mots.
        4.  **Filtrage lexicologique (Stop-words)** : Utilisation d'un `Set` optimisé de mots vides financiers et linguistiques pour éliminer le bruit grammatical (*the, and, to, a, or...*).
        5.  **Reconstitution** : Agrégation des mots clés restants en un corps textuel dense et hautement sémantique.
*   **Classification Contextuelle et Polarité (Google Gemini 2.5 Flash SDK)** :
    *   Transmission du texte épuré via le SDK `@google/genai`.
    *   Utilisation d'instructions de rôle strictes (Few-Shot prompting) forçant le modèle à classer l'humeur du marché en trois catégories (`BULLISH`, `BEARISH`, `NEUTRAL`) et à produire un score mathématique précis compris entre **$-1.0$ (très baissier)** et **$+1.0$ (très haussier)**.
    *   Le service contraint Gemini à renvoyer un format JSON brut épuré de tout bloc markdown pour une intégration native.

---

## 4. Spécifications des Endpoints de l'API

Le tableau suivant liste l'ensemble des routes HTTP exposées par le serveur :

| Méthode | Route | Auth | Rôle | Description | Payload de Requête | Payload de Réponse (Succès) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | Non | Tous | Enregistre un nouvel utilisateur et son portefeuille de 100k USD | `{ name, email, password }` | `{ message, user: { id, name, email, role } }` |
| **POST** | `/api/v1/auth/login` | Non | Tous | Valide les identifiants et distribue les jetons d'accès JWT | `{ email, password }` | `{ message, accessToken, refreshToken, user }` |
| **POST** | `/api/v1/trade/market-order` | Oui | Client | Exécute un ordre d'Achat ou de Vente au Marché de manière atomique | `{ ticker, type, quantity }` | `{ message, data: { orderId, ticker, executedPrice, quantity, totalCost/totalGain, remainingCash } }` |
| **POST** | `/api/v1/analytics/sentiment` | Oui | Client | Analyse le sentiment d'une dépêche financière via la chaîne NLP + Gemini | `{ text, ticker }` | `{ ticker, timestamp, analysis: { originalLength, cleanedTextSnippet, sentiment, score } }` |
| **GET** | `/api/v1/client/dashboard` | Oui | Client | Accès sécurisé à l'espace client | *Aucun* | `{ message, userId, role }` |
| **GET** | `/api/v1/admin/dashboard` | Oui | Admin | Accès sécurisé à l'espace administration réservé | *Aucun* | `{ message }` |
| **GET** | `/health` | Non | Tous | Vérification de la santé globale de l'API et des workers | *Aucun* | `{ status, message }` |

---

## 5. Flux de Données Événementiels (Socket.io)

### Événements Entrants (Client ➔ Backend)
*   `subscribe` : Abonne la connexion du client au salon temps réel d'un ticker (ex: `socket.emit('subscribe', 'AAPL')`).
*   `unsubscribe` : Désabonne la connexion du client du salon d'un ticker (ex: `socket.emit('unsubscribe', 'AAPL')`).

### Événements Sortants (Backend ➔ Client)
*   `priceUpdate` : Diffusé aux abonnés du salon du ticker à chaque tick de marché réel.
    *   **Payload** :
        ```json
        {
          "ticker": "AAPL",
          "bid": "150.2500",
          "ask": "150.4000",
          "last": "150.3250",
          "timestamp": 1779100748
        }
        ```

---
*Ce cahier des charges décrit l'état de l'art technique du backend d'InvestX, garantissant des performances financières fiables, une sécurité absolue et une extensibilité simplifiée pour le frontend.*
