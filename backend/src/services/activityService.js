const db = require('../config/db');

class ActivityService {
    /**
     * Récupère l'historique complet des transactions d'un utilisateur
     */
    async getUserActivity(userId) {
        return db('transactions')
            .join('orders', 'transactions.order_id', '=', 'orders.id')
            .join('wallets', 'orders.wallet_id', '=', 'wallets.id')
            .select(
                'transactions.id',
                'transactions.ticker',
                'transactions.price_per_unit',
                'transactions.quantity',
                'transactions.executed_at',
                'orders.side', // BUY or SELL
                'orders.type as order_type' // MARKET or LIMIT
            )
            .where('wallets.user_id', userId)
            .orderBy('transactions.executed_at', 'desc');
    }
}

module.exports = new ActivityService();