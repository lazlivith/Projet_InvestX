const db = require('../config/db');
const orderEngine = require('../services/orderEngine');
const quoteService = require('../services/quoteService');

const handleMarketOrder = async (req, res) => {
    try {
        const { ticker, type, quantity } = req.body;
        const userId = req.user.id; // Injecté par le authMiddleware

        if (!ticker || !type || !quantity) {
            return res.status(400).json({ error: "Paramètres manquants (ticker, type, quantity)." });
        }

        const result = await orderEngine.executeMarketOrder(userId, {
            ticker,
            type: type.toLowerCase(), // Correction: send type in lowercase to orderEngine
            quantity: parseFloat(quantity),
            isLimitOrder: false
        });

        return res.status(200).json({
            message: "Ordre exécuté sur le marché avec succès.",
            data: result
        });

    } catch (error) {
        console.error(`❌ [TradeController] Erreur lors de l'exécution de l'ordre:`, error.message);
        console.error(`❌ [TradeController] Stack trace:`, error.stack);
        return res.status(422).json({
            error: "Échec de l'exécution de l'ordre.",
            details: error.message
        });
    }
};

const handleLimitOrder = async (req, res) => {
    try {
        const { ticker, type, quantity, limitPrice } = req.body;
        const userId = req.user.id; // Injecté par le authMiddleware

        if (!ticker || !type || !quantity || !limitPrice) {
            return res.status(400).json({ error: "Paramètres manquants (ticker, type, quantity, limitPrice)." });
        }

        const result = await orderEngine.createLimitOrder(userId, {
            ticker,
            type: type.toLowerCase(), // Correction: send type in lowercase to orderEngine
            quantity: parseFloat(quantity),
            targetPrice: parseFloat(limitPrice) // Correction: le moteur attend targetPrice
        });

        return res.status(201).json({
            message: "Ordre limite placé avec succès (PENDING).",
            data: result
        });

    } catch (error) {
        return res.status(422).json({
            error: "Échec de la création de l'ordre limite.",
            details: error.message
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.status(400).json({ error: "L'ID de l'ordre (orderId) est requis." });
        }

        const result = await orderEngine.cancelLimitOrder(userId, orderId);

        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({
            error: "Échec de l'annulation de l'ordre.",
            details: error.message
        });
    }
};

const getQuote = async (req, res) => {
    try {
        const { ticker } = req.params;
        if (!ticker) {
            return res.status(400).json({ error: "Le ticker est requis." });
        }
        const quote = await quoteService.getQuote(ticker);
        return res.status(200).json(quote);
    } catch (error) {
        return res.status(500).json({
            error: "Erreur lors de la récupération du prix.",
            details: error.message
        });
    }
};

const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const ticker = req.query.ticker;

        // 1. Paramètres de pagination avec des valeurs par défaut
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Construction de la requête de base
        let query = db('transactions')
            .select(
                'transactions.*' // On ne sélectionne que les colonnes de la transaction pour éviter les collisions d'ID
            )
            .join('wallets', 'transactions.wallet_id', 'wallets.id')
            .where('wallets.user_id', userId);

        // Ajout du filtre par ticker si présent
        if (ticker) {
            query = query.andWhere({ ticker: ticker.toUpperCase() });
        }

        // 2. Compter le nombre total de transactions pour cet utilisateur
        // Lever l'ambiguïté sur la colonne ID en spécifiant transactions.id
        const countResult = await query.clone().clearSelect().clearOrder().count('transactions.id as count').first();

        const totalItems = countResult ? parseInt(countResult.count) : 0;

        // 3. Récupérer les transactions paginées
        const transactions = await query.clone()
            .orderBy('executed_at', 'desc')
            .limit(limit)
            .offset(offset);

        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                total: totalItems,
                page,
                limit,
                totalPages: Math.ceil(totalItems / limit)
            }
        });
    } catch (error) {
        console.error("❌ Erreur getUserActivity :", error.message);
        return res.status(500).json({
            error: "Impossible de récupérer votre historique de transactions."
        });
    }
};

module.exports = {
    handleMarketOrder,
    handleLimitOrder,
    cancelOrder,
    getQuote,
    getUserActivity
};
