const db = require('../config/db');
const crypto = require('crypto');

class AlertRepository {
    async createAlert(userId, ticker, alertType, targetPrice) {
        const [alert] = await db('alerts').insert({
            id: crypto.randomUUID(),
            user_id: userId,
            ticker: ticker.toUpperCase(),
            alert_type: alertType,
            target_price: targetPrice,
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');
        return alert;
    }

    async getAlertsByUserId(userId) {
        return db('alerts').where({ user_id: userId }).orderBy('created_at', 'desc');
    }

    async getActiveAlertsByTicker(ticker) {
        return db('alerts').where({ ticker: ticker.toUpperCase(), is_active: true });
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