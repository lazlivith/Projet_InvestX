const db = require('../config/db');

const getUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Récupérer le portefeuille lié à l'utilisateur
        const wallet = await db('wallets').where({ user_id: userId }).first();
        if (!wallet) {
            return res.status(404).json({ error: "Aucun portefeuille actif trouvé." });
        }

        // 2. Récupérer les transactions exécutées
        const transactions = await db('transactions')
            .where({ wallet_id: wallet.id })
            .orderBy('executed_at', 'desc');

        // 3. Récupérer les ordres en attente (LIMIT orders en statut 'pending')
        const pendingOrders = await db('orders')
            .where({ wallet_id: wallet.id, status: 'pending' })
            .orderBy('created_at', 'desc');

        return res.status(200).json({
            walletId: wallet.id,
            cashBalance: wallet.cash_balance,
            pendingOrders,
            history: transactions
        });
    } catch (error) {
        return res.status(500).json({
            error: "Impossible de générer l'historique d'activité.",
            details: error.message
        });
    }
};

module.exports = { getUserActivity };