# 📘 Cahier des Charges & Guide d'Intégration Frontend — InvestX 🚀
> **Spécifications complètes des APIs, des structures JSON et des flux temps réel Socket.io**
> *Destiné à l'équipe de développement Frontend (React / Vite)*

---

## 1. Introduction & Objectif
Ce document définit l'ensemble des contrats d'interface (HTTP REST et WebSockets) exposés par le backend d'**InvestX** sur le port par défaut `5000` (ou paramétrable via `PORT` dans le `.env`).

L'objectif de ce cahier des charges est de permettre le développement d'une application client (React / Vite) conforme au moteur d'ordres boursiers, au système de sécurité double-jeton (JWT), et au flux boursier en temps réel.

---

## 2. Système d'Authentification & Sécurité (JWT)
Toutes les requêtes vers les endpoints sécurisés doivent obligatoirement inclure le jeton d'accès dans l'en-tête HTTP sous la forme suivante :
```http
Authorization: Bearer <votre_access_token>
```

### 🔐 Inscription (Register)
Crée un compte utilisateur et associe automatiquement un portefeuille papier crédité de **100 000,00 USD**.
* **Route** : `POST /api/v1/auth/register`
* **Headers** : `Content-Type: application/json`
* **Corps de la Requête (JSON)** :
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SuperPassword123"
  }
  ```
* **Réponse Succès (201 Created)** :
  ```json
  {
    "message": "Utilisateur enregistré avec succès.",
    "user": {
      "id": "4eef9d2c-2a43-41e3-ae8d-68bb342132e1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "client"
    }
  }
  ```
* **Réponse Échec (400 Bad Request / 409 Conflict)** :
  ```json
  {
    "error": "Cet e-mail est déjà utilisé."
  }
  ```

---

### 🔑 Connexion (Login)
Valide les identifiants de l'utilisateur et distribue les jetons de session (Access et Refresh Tokens).
* **Route** : `POST /api/v1/auth/login`
* **Headers** : `Content-Type: application/json`
* **Corps de la Requête (JSON)** :
  ```json
  {
    "email": "jane@example.com",
    "password": "SuperPassword123"
  }
  ```
* **Réponse Succès (200 OK)** :
  ```json
  {
    "message": "Connexion réussie.",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "4eef9d2c-2a43-41e3-ae8d-68bb342132e1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "client"
    }
  }
  ```
  > ⚠️ **Action requis côté React** :
  > 1. Stocker l'`accessToken` en mémoire locale volatile (State / Redux / Context) ou dans un cookie sécurisé.
  > 2. Stocker le `refreshToken` de manière persistante pour renouveler la session de manière transparente.

---

### 👤 Accès Dashboard Client (Sécurisé)
Vérifie la validité du jeton d'accès et renvoie les privilèges de l'utilisateur.
* **Route** : `GET /api/v1/client/dashboard`
* **Headers** : `Authorization: Bearer <accessToken>`
* **Réponse Succès (200 OK)** :
  ```json
  {
    "message": "Bienvenue sur l'espace privé du Dashboard Client !",
    "userId": "4eef9d2c-2a43-41e3-ae8d-68bb342132e1",
    "role": "client"
  }
  ```
* **Réponse Échec (401 Unauthorized / 403 Forbidden)** :
  ```json
  {
    "error": "Accès refusé. Token manquant ou invalide."
  }
  ```

---

### 👑 Accès Dashboard Admin (Sécurisé Admin)
Endpoint réservé exclusivement aux administrateurs pour le panneau de contrôle global.
* **Route** : `GET /api/v1/admin/dashboard`
* **Headers** : `Authorization: Bearer <accessToken>`
* **Réponse Succès (200 OK)** :
  ```json
  {
    "message": "Accès autorisé. Bienvenue sur le Panneau de Contrôle Admin d'InvestX."
  }
  ```
* **Réponse Échec (403 Forbidden - si le rôle de l'utilisateur est 'client')** :
  ```json
  {
    "error": "Accès interdit. Rôle Administrateur requis."
  }
  ```

---

## 3. Moteur de Trading (Market Orders)
Permet d'exécuter des ordres d'achat ou de vente au marché à partir du bouton d'action de l'interface client.

* **Route** : `POST /api/v1/trade/market-order`
* **Headers** : 
  * `Content-Type: application/json`
  * `Authorization: Bearer <accessToken>`
* **Corps de la Requête (JSON)** :
  ```json
  {
    "ticker": "AAPL",
    "type": "BUY" | "SELL",
    "quantity": 5
  }
  ```

### 🛒 Scénario 1 : Achat Marché (BUY) - Succès
Exécute l'achat, débite le cash disponible du portefeuille (`cash_available` en DB), crée/met à jour la position (`average_purchase_price` recalculé selon le PUMP) et journalise les logs.
* **Réponse Succès (200 OK)** :
  ```json
  {
    "message": "Ordre exécuté sur le marché avec succès.",
    "data": {
      "orderId": "b84103ef-f83c-4fd1-a0e9-f3f95a555c71",
      "ticker": "AAPL",
      "executedPrice": 150.5,
      "quantity": 5,
      "totalCost": 752.5,
      "remainingCash": 99247.5
    }
  }
  ```

### 📉 Scénario 2 : Vente Marché (SELL) - Succès
Exécute la vente, débite la quantité d'actions de la position (supprime la position si quantité = 0), crédite le cash sur le portefeuille et journalise les logs.
* **Réponse Succès (200 OK)** :
  ```json
  {
    "message": "Ordre exécuté sur le marché avec succès.",
    "data": {
      "ticker": "AAPL",
      "executedPrice": 150,
      "quantity": 5,
      "totalGain": 750,
      "remainingCash": 100000
    }
  }
  ```

### ❌ Scénario 3 : Échec d'Exécution (Insolvabilité / Solde insuffisant)
Retourné si le cash disponible est insuffisant (pour un BUY) ou si le nombre d'actions possédées est insuffisant (pour un SELL).
* **Réponse Échec (422 Unprocessable Entity)** :
  ```json
  {
    "error": "Échec de l'exécution de l'ordre.",
    "details": "Solvabilité insuffisante. Requis: 15050$, Disponible: 1000$"
  }
  ```

---

## 4. Analyse Sentiment NLP & IA (Aide à la Décision)
Permet à l'utilisateur de soumettre un article financier pour obtenir instantanément une analyse quantitative sémantique (BULLISH, BEARISH, NEUTRAL) et un score de polarité de marché.

* **Route** : `POST /api/v1/analytics/sentiment`
* **Headers** : 
  * `Content-Type: application/json`
  * `Authorization: Bearer <accessToken>`
* **Corps de la Requête (JSON)** :
  ```json
  {
    "text": "Apple (AAPL) reported outstanding earnings this quarter, revenues have surged by 25%...",
    "ticker": "AAPL" 
  }
  ```
* **Réponse Succès (200 OK)** :
  ```json
  {
    "ticker": "AAPL",
    "timestamp": "2026-05-18T11:00:00.000Z",
    "analysis": {
      "originalLength": 219,
      "cleanedTextSnippet": "breaking apple inc aapl reported outstanding earnings...",
      "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
      "score": 0.98
    }
  }
  ```
  > 📈 **Astuce Frontend** : 
  > * Si le sentiment est `BULLISH`, affichez une jauge verte. Le score de `0.98` correspond à une tendance positive à $98\%$.
  > * Si le sentiment est `BEARISH`, affichez une jauge rouge avec une tendance baissière.

---

## 5. Flux Temps Réel WebSocket (Socket.io)
Pour synchroniser les graphiques boursiers (Chandelier japonais / Candlesticks) et les prix d'achat/vente sans rafraîchir la page, connectez-vous au serveur Socket.io.

* **URL du Serveur de flux** : `http://localhost:5000` (ou URL hôte en production)
* **Protocole** : WebSocket / Socket.io

### 📈 S'abonner aux flux d'une action (Subscribe)
Pour économiser la bande passante, le client React doit s'abonner exclusivement au ticker qu'il affiche à l'écran (ex: dans la page de détails de `TSLA`).
* **Événement à envoyer (Emit)** : `subscribe`
* **Payload (String)** : Le Symbole de l'action (ex: `"TSLA"`)
* **Exemple JS/React** :
  ```javascript
  socket.emit('subscribe', 'TSLA');
  ```

### 📉 Se désabonner d'une action (Unsubscribe)
À appeler lorsque l'utilisateur quitte la page de détails ou change d'action pour libérer les ressources.
* **Événement à envoyer (Emit)** : `unsubscribe`
* **Payload (String)** : Le Symbole de l'action (ex: `"TSLA"`)
* **Exemple JS/React** :
  ```javascript
  socket.emit('unsubscribe', 'TSLA');
  ```

### 🔔 Écouter les mises à jour de prix (Listen)
Dès qu'une transaction survient sur le marché boursier réel, le backend émet une mise à jour de cotation pour tous les clients abonnés.
* **Événement à écouter (Listen)** : `priceUpdate`
* **Payload reçu (JSON)** :
  ```json
  {
    "ticker": "AAPL",
    "bid": "150.2500",
    "ask": "150.4000",
    "last": "150.3250",
    "timestamp": 1779100748
  }
  ```
  > 📊 **Règles d'affichage Frontend** :
  > 1. Utilisez le prix **`ask`** (Demande) pour afficher le bouton **"Acheter"**. C'est le prix auquel l'utilisateur va acquérir l'actif.
  > 2. Utilisez le prix **`bid`** (Offre) pour afficher le bouton **"Vendre"**. C'est le prix auquel l'utilisateur va liquider ses parts.
  > 3. Utilisez le prix **`last`** (Dernier cours) pour dessiner les graphiques et calculer la performance sémantique (Equity & P/L) du portefeuille en temps réel.

---

## 6. Codes de Diagnostic & Health Check
Route publique pour valider le statut des flux de données en production.
* **Route** : `GET /health`
* **Réponse Succès (200 OK)** :
  ```json
  {
    "status": "OK",
    "message": "Moteur Temps Réel Finnhub & Socket.io activés."
  }
  ```

---
*Ce document sert de contrat d'intégration. Tout comportement s'écartant de ces définitions doit être signalé au Product Engineer.*
