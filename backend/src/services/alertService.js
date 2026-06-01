const db = require('../config/db');
const { getIO } = require('../config/socket');

class AlertService {
    async checkPriceAlerts(ticker, currentPrice) {
        const activeAlerts = await db('alerts')
            .where({ ticker, is_active: true })
            .andWhere(function () {
                this.where('target_price', '<=', currentPrice).andWhere('direction', 'UP')
                    .orWhere('target_price', '>=', currentPrice).andWhere('direction', 'DOWN');
            });

        for (const alert of activeAlerts) {
            // 1. Notifier via Socket.io
            const io = getIO();
            io.to(`user_${alert.user_id}`).emit('notification', {
                type: 'PRICE_ALERT',
                message: `L'actif ${ticker} a atteint votre seuil de ${alert.target_price} $ !`,
                ticker
            });

            // 2. Désactiver l'alerte pour éviter le spam
            await db('alerts').where({ id: alert.id }).update({ is_active: false });

            console.log(`[AlertService] Alerte déclenchée pour l'utilisateur ${alert.user_id} sur ${ticker}`);
        }
    }
}

module.exports = new AlertService();