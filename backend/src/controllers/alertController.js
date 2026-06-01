const alertService = require('../services/alertService');

class AlertController {
    async createAlert(req, res) {
        try {
            const userId = req.user.id;
            const { ticker, alert_type, target_price } = req.body;

            if (!ticker || !alert_type || !target_price) {
                return res.status(400).json({ error: 'Ticker, alert_type, and target_price are required.' });
            }

            const alert = await alertService.createAlert(userId, ticker, alert_type, parseFloat(target_price));
            res.status(201).json({ message: 'Alert created successfully.', alert });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getAlerts(req, res) {
        try {
            const userId = req.user.id;
            const alerts = await alertService.getUserAlerts(userId);
            res.status(200).json(alerts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteAlert(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params; // ID de l'alerte depuis le paramètre d'URL
            const result = await alertService.deleteUserAlert(id, userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
}

module.exports = new AlertController();