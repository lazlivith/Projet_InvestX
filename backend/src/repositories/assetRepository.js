const db = require('../config/db');

class AssetRepository {
    // Trouver un actif spécifique dans un portefeuille (wallet)
    async getAssetByTicker(walletId, ticker, transaction = db) {
        return transaction('positions')
            .where({ wallet_id: walletId, ticker: ticker.toUpperCase() })
            .first();
    }
}

module.exports = new AssetRepository();
