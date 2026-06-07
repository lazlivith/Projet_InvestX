const db = require('../config/db');
const crypto = require('crypto');

class AlertRepository {
    async createAlert(userId, ticker, alertType, targetPrice) {
        const [alert] = await db('alerts').insert({
            user_id: userId, // Correction: 'user_id' au lieu de 'userId'
            ticker: ticker.toUpperCase(),
            direction: alertType, // Correction: 'direction' au lieu de 'alert_type'
            target_price: targetPrice
        }).returning('*');
        return alert;
    }

    async getAlertsByUserId(userId) {
        return db('alerts').where({ user_id: userId }).orderBy('created_at', 'desc');
    }

    async getActiveAlertsByTicker(ticker) {
        return db('alerts').where({ ticker: ticker.toUpperCase(), is_active: true }).select('*'); // Ajout de select('*') pour s'assurer de récupérer toutes les colonnes
    }

    async updateAlertStatus(alertId, isActive, triggeredAt = null) {
        const updateData = { is_active: isActive, updated_at: new Date() };
        if (triggeredAt) {
            updateData.triggered_at = triggeredAt;
        }
        const [updatedAlert] = await db('alerts')
            .where({ id: alertId })
            .update(updateData)
            .returning('*');
        return updatedAlert;
    }

    async deleteAlert(alertId, userId) {
        const deletedCount = await db('alerts').where({ id: alertId, user_id: userId }).del();
        return deletedCount > 0;
    }
}

module.exports = new AlertRepository();