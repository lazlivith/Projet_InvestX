const currencyService = require('../services/currencyService');

/**
 * Ce worker rafraîchit les taux de change en arrière-plan pour éviter la latence
 * et respecter les quotas de l'API TwelveData.
 */
const SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000; // Toutes les 3 heures

async function runExchangeRateWorker() {
    console.log('[ExchangeRateWorker] Démarrage du worker de synchronisation des devises...');

    const syncRates = async () => {
        try {
            // Liste des paires critiques pour la plateforme
            const pairs = [
                { base: 'USD', target: 'EUR' },
                { base: 'EUR', target: 'USD' }
            ];

            for (const pair of pairs) {
                await currencyService.getExchangeRate(pair.base, pair.target);
            }
            console.log(`[ExchangeRateWorker] Synchronisation réussie pour ${pairs.length} paires.`);
        } catch (error) {
            console.error('[ExchangeRateWorker] Erreur lors de la synchro:', error.message);
        }
    };

    await syncRates();
    setInterval(syncRates, SYNC_INTERVAL_MS);
}

module.exports = runExchangeRateWorker;