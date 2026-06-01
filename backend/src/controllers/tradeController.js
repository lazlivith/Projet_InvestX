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
            type: type.toUpperCase(),
            quantity: parseFloat(quantity),
            isLimitOrder: false
        });

        return res.status(200).json({
            message: "Ordre exécuté sur le marché avec succès.",
            data: result
        });

    } catch (error) {
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
            type: type.toUpperCase(),
            quantity: parseFloat(quantity),
            limitPrice: parseFloat(limitPrice)
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

module.exports = {
    handleMarketOrder,
    handleLimitOrder,
    cancelOrder,
    getQuote
};
