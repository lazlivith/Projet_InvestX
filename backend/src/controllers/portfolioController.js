const portfolioService = require('../services/portfolioService');

class PortfolioController {
    async getDashboardSummary(req, res) {
        try {
            const userId = req.user.id;
            const summary = await portfolioService.getPortfolioSummary(userId);
            res.status(200).json(summary);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPortfolioHistory(req, res) {
        try {
            const userId = req.user.id;
            const history = await portfolioService.getPortfolioHistory(userId);
            res.status(200).json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PortfolioController();