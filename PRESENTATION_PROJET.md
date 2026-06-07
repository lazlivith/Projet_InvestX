# 🚀 Présentation InvestX
**Le trading de demain, aujourd'hui.**

---

## 📌 SOMMAIRE
1. **Vision du Produit** : Pourquoi InvestX ?
2. **L'Expérience Utilisateur** : Dashboard & Trading
3. **Le Moteur Transactionnel** : La rigueur financière
4. **Flux Temps Réel** : Performance & Résilience
5. **IA appliquée** : Analyse de sentiment NLP
6. **Conclusion & Perspectives**

---

## 🛝 Slide 1 : Vision du Produit
**Problématique** : Apprendre la bourse est risqué et les outils de simulation sont souvent lents ou complexes.
**Solution InvestX** :
- Capital virtuel de **100 000 $** offert à l'inscription.
- Interface moderne, sombre et intuitive.
- Données réelles des marchés américains (AAPL, TSLA, MSFT...).

---

## 🛝 Slide 2 : Stack Technique
**Un écosystème robuste :**
- **Frontend** : React/TS + Tailwind + Vite.
- **Backend** : Node.js + PostgreSQL + Redis.
- **Communication** : WebSockets (Socket.io) pour le direct.
- **Cerveau** : Google Gemini Pro pour l'analyse sémantique.

---

## 🛝 Slide 3 : Moteur de Trading (Order Engine)
**Comment garantissons-nous l'intégrité ?**
- **Transactions Atomiques** : Garantie de cohérence entre le solde cash et les actions possédées.
- **Moteur Limite** : Exécution automatique des ordres en arrière-plan dès que le prix touche la cible.
- **PUMP** : Calcul automatique de la rentabilité historique.

---

## 🛝 Slide 4 : Temps Réel & Caching
**Le défi de la performance :**
- Réception des flux via **Finnhub WebSocket**.
- Stockage dans **Redis** pour un accès en lecture instantané.
- Diffusion ciblée via **Socket.io Rooms** pour optimiser la bande passante du client.

---

## 🛝 Slide 5 : IA & Analyse Sentiment
**L'innovation InvestX :**
- Pipeline NLP hybride qui nettoie le texte localement (Stop-words, tokenisation).
- Classification par **IA (Gemini)** pour donner un signal : **BULLISH** (Acheteur) ou **BEARISH** (Vendeur).
- Score de polarité pour aider le trader à prendre une décision.

---

## 🛝 Slide 6 : Administration & Audit
**Contrôle Total :**
- Panel Admin pour gérer les utilisateurs (Activation/Désactivation).
- Audit global de toutes les transactions de la plateforme.
- Statistiques de volume global et KPIs en temps réel.

---
**Merci de votre attention !**
*Des questions ?*