const redisClient = require('../config/redis');

class QuoteService {
    /**
     * Récupère les prix BID, ASK et LAST d'un actif depuis Redis
     * @param {string} ticker - Le symbole de l'action (ex: AAPL)
     */
    async getQuote(ticker) {
        const key = `quote:${ticker.toUpperCase()}`;

        // Fallback immédiat si le client Redis n'est pas prêt/connecté
        if (!redisClient.isReady) {
            return {
                bid: 150.0000,
                ask: 150.5000,
                last: 150.2500,
                source: 'mock_fallback'
            };
        }

        try {
            const data = await redisClient.get(key);
            if (!data) {
                return {
                    bid: 150.0000,
                    ask: 150.5000,
                    last: 150.2500,
                    source: 'mock_fallback'
                };
            }
            return JSON.parse(data);
        } catch (err) {
            console.warn(`⚠️ Erreur de lecture du cache Redis pour ${ticker}:`, err.message);
            return {
                bid: 150.0000,
                ask: 150.5000,
                last: 150.2500,
                source: 'mock_fallback'
            };
        }
    }

    /**
     * Permet de mettre à jour les prix dans Redis (utilisé par le worker WebSocket Finnhub)
     */
    async updateQuote(ticker, bid, ask, last) {
        // Ignorer l'écriture si le client Redis n'est pas prêt/connecté
        if (!redisClient.isReady) {
            return;
        }

        const key = `quote:${ticker.toUpperCase()}`;
        const payload = {
            bid: parseFloat(bid),
            ask: parseFloat(ask),
            last: parseFloat(last),
            updatedAt: new Date()
        };
        try {
            await redisClient.set(key, JSON.stringify(payload));
        } catch (err) {
            console.error(`❌ Erreur d'écriture dans le cache Redis pour ${ticker}:`, err.message);
        }
    }
}

module.exports = new QuoteService();
