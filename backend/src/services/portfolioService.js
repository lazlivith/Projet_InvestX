const db = require('../config/db');
const quoteService = require('./quoteService');
const crypto = require('crypto');
const currencyService = require('./currencyService'); // Importation du service de devises

class PortfolioService {
    async getPortfolioSummary(userId) {
        // Récupérer l'utilisateur et son portefeuille en une seule requête si possible,
        // ou deux requêtes distinctes si les tables ne sont pas directement liées par une FK.
        // Assumons que 'users' et 'wallets' sont liés par user_id.
        const userAndWallet = await db('users')
            .join('wallets', 'users.id', '=', 'wallets.user_id')
            .select(
                'wallets.id as wallet_id',
                'wallets.cash_balance',
                'users.preferred_currency as wallet_currency'
            )
            .where('users.id', userId)
            .first();

        if (!userAndWallet) {
            throw new Error('User or Wallet not found for this user.');
        }

        const userPreferredCurrency = userAndWallet.wallet_currency || 'USD';
        const walletCurrency = userAndWallet.wallet_currency || 'USD'; // Devise du cash dans le portefeuille
        const walletId = userAndWallet.wallet_id;

        // Convertir le cash disponible dans la devise préférée de l'utilisateur
        let cashAvailableInPreferredCurrency = await currencyService.convertAmount(
            parseFloat(userAndWallet.cash_balance),
            walletCurrency,
            userPreferredCurrency
        );

        const positions = await db('portfolio_assets').where({ wallet_id: walletId });

        let totalEquity = cashAvailableInPreferredCurrency;
        let totalMarketValue = 0;
        let totalProfitLoss = 0; // P/L total sur toutes les positions

        const positionsWithQuotes = await Promise.all(positions.map(async (position) => {
            const quote = await quoteService.getQuote(position.ticker);
            const currentPriceUSD = parseFloat(quote.last); // Le prix de Finnhub est en USD
            const quantity = parseFloat(position.quantity);
            const averagePurchasePrice = parseFloat(position.pump);

            const marketValueUSD = quantity * currentPriceUSD;
            const profitLossUSD = (currentPriceUSD - averagePurchasePrice) * quantity;

            // Convertir la valeur de marché et le P/L de la position dans la devise préférée de l'utilisateur
            const marketValueInPreferredCurrency = await currencyService.convertAmount(marketValueUSD, 'USD', userPreferredCurrency);
            const profitLossInPreferredCurrency = await currencyService.convertAmount(profitLossUSD, 'USD', userPreferredCurrency);

            totalMarketValue += marketValueInPreferredCurrency;
            totalProfitLoss += profitLossInPreferredCurrency;
            totalEquity += marketValueInPreferredCurrency; // Cash converti + Valeur de marché des positions convertie

            return {
                ...position,
                current_price: currentPriceUSD, // Garder le prix original en USD pour référence
                market_value: marketValueInPreferredCurrency,
                profit_loss: profitLossInPreferredCurrency,
                profit_loss_percentage: (profitLossUSD / (averagePurchasePrice * quantity)) * 100 || 0
            };
        }));

        return {
            userId: userId,
            cashAvailable: cashAvailableInPreferredCurrency,
            totalMarketValue: totalMarketValue,
            totalEquity: totalEquity,
            totalProfitLoss: totalProfitLoss,
            currency: userPreferredCurrency, // Indiquer la devise de tous les montants
            positions: positionsWithQuotes
        };
    }

    async getPortfolioHistory(userId) {
        // Récupère les instantanés historiques pour les graphiques
        return db('portfolio_snapshots')
            .join('wallets', 'portfolio_snapshots.wallet_id', '=', 'wallets.id')
            .where('wallets.user_id', userId)
            .orderBy('portfolio_snapshots.snapshot_date', 'asc');
    }

    async snapshotPortfolio(userId) {
        const summary = await this.getPortfolioSummary(userId);
        const walletId = summary.positions[0]?.wallet_id;
        if (!walletId) return;

        await db('portfolio_snapshots').insert({
            wallet_id: walletId,
            cash_value: summary.cashAvailable,
            assets_value: summary.totalMarketValue,
            total_equity: summary.totalEquity,
            snapshot_date: new Date()
        });
        console.log(`[PortfolioService] Snapshot created for user ${userId}`);
    }
}

module.exports = new PortfolioService();