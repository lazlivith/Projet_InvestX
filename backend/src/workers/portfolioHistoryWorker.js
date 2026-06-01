const portfolioService = require('../services/portfolioService');
const db = require('../config/db');

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // Instantané toutes les heures

async function runPortfolioHistoryWorker() {
    console.log('[PortfolioHistoryWorker] Starting portfolio history worker...');

    const takeSnapshot = async () => {
        try {
            const users = await db('users').select('id');
            for (const user of users) {
                await portfolioService.snapshotPortfolio(user.id);
            }
            console.log(`[PortfolioHistoryWorker] Snapshots taken for ${users.length} users.`);
        } catch (error) {
            console.error('[PortfolioHistoryWorker] Error taking portfolio snapshots:', error.message);
        }
    };

    await takeSnapshot(); // Prendre un instantané immédiat au démarrage
    setInterval(takeSnapshot, SNAPSHOT_INTERVAL_MS); // Planifier les instantanés périodiques
}

module.exports = runPortfolioHistoryWorker;