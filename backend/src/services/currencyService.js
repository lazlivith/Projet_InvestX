const db = require('../config/db');
const axios = require('axios');

// Dans une application réelle, ceci récupérerait les données d'une API externe
// Pour l'instant, nous utiliserons des taux fictifs ou statiques.
const MOCK_EXCHANGE_RATES = {
    'USD_EUR': 0.92,
    'EUR_USD': 1.08,
    'USD_USD': 1.00,
    'EUR_EUR': 1.00
};

class CurrencyService {
    async getExchangeRate(baseCurrency, targetCurrency) {
        if (baseCurrency === targetCurrency) {
            return 1.0;
        }

        // 1. Stratégie de Cache : Récupérer le taux actuel en base de données
        const cachedRate = await db('exchange_rates')
            .where({ base_currency: baseCurrency, target_currency: targetCurrency })
            .first();

        // Définir la durée de validité du cache (ex: 1 heure = 3600000 ms)
        const CACHE_TTL = 3600000;
        const isCacheFresh = cachedRate && (new Date() - new Date(cachedRate.updated_at)) < CACHE_TTL;

        // Si le cache est récent, on évite un appel API inutile
        if (isCacheFresh) {
            return parseFloat(cachedRate.rate);
        }

        try {
            const apiKey = process.env.TWELVEDATA_API_KEY;
            if (!apiKey) throw new Error("TWELVEDATA_API_KEY manquante.");

            console.log(`[CurrencyService] Fetching fresh rate for ${baseCurrency}/${targetCurrency} from TwelveData...`);

            const response = await axios.get(`https://api.twelvedata.com/exchange_rate`, {
                params: {
                    symbol: `${baseCurrency}/${targetCurrency}`,
                    apikey: apiKey
                }
            });

            // TwelveData renvoie parfois une erreur 200 avec un body d'erreur (rate limit)
            if (response.data.status === 'error') {
                throw new Error(`TwelveData Error: ${response.data.message}`);
            }

            if (response.data && response.data.rate) {
                const rate = parseFloat(response.data.rate);
                // Mettre à jour le cache en base de données
                await this.updateExchangeRate(baseCurrency, targetCurrency, rate);
                return rate;
            }

            throw new Error("Format de réponse API invalide.");

        } catch (error) {
            // Gestion des erreurs et des limites de requêtes
            console.error(`[CurrencyService] Erreur lors de la récupération du taux : ${error.message}`);

            // Fallback : Si l'API échoue ou limite atteinte, on utilise le taux en cache (même périmé)
            if (cachedRate) {
                console.warn(`[CurrencyService] Utilisation du taux expiré en cache pour ${baseCurrency}/${targetCurrency}`);
                return parseFloat(cachedRate.rate);
            }
        }

        // Fallback ou erreur si le taux n'est pas trouvé
        console.warn(`[CurrencyService] Exchange rate not found for ${baseCurrency} to ${targetCurrency}. Using 1.0.`);
        return 1.0;
    }

    async convertAmount(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        return amount * rate;
    }

    async updateExchangeRate(baseCurrency, targetCurrency, rate) {
        await db('exchange_rates')
            .insert({ base_currency: baseCurrency, target_currency: targetCurrency, rate: rate, updated_at: new Date() })
            .onConflict(['base_currency', 'target_currency'])
            .merge(['rate', 'updated_at']);
    }
}

module.exports = new CurrencyService();