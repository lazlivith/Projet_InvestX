const db = require('../config/db');
const crypto = require('crypto');
const quoteService = require('./quoteService');

class OrderEngine {
    /**
     * Traite les ordres limites en attente pour un ticker donné
     * Appelé par le FinnhubWorker à chaque mise à jour de prix
     */
    async processLimitOrders(ticker, bid, ask) {
        // 1. Récupérer les ordres "PENDING" pour ce ticker
        const pendingOrders = await db('orders')
            .where({ ticker, status: 'PENDING', side: 'LIMIT' })
            .select('*');

        for (const order of pendingOrders) {
            let shouldExecute = false;
            const limitPrice = parseFloat(order.limit_price);

            if (order.type === 'BUY' && ask <= limitPrice) {
                // Le prix a baissé jusqu'à notre limite d'achat
                shouldExecute = true;
            } else if (order.type === 'SELL' && bid >= limitPrice) {
                // Le prix est monté jusqu'à notre limite de vente
                shouldExecute = true;
            }

            if (shouldExecute) {
                console.log(`[OrderEngine] Déclenchement de l'ordre LIMITE ${order.id} pour ${ticker}`);
                await this.executeMarketOrder(order.user_id, {
                    ticker: order.ticker,
                    type: order.type,
                    quantity: order.quantity,
                    isLimitOrder: true,
                    originalOrderId: order.id,
                    forcedPrice: order.type === 'BUY' ? ask : bid // On exécute au prix actuel du marché qui a touché la limite
                });
            }
        }
    }

    /**
     * Enregistre un ordre limite en base de données avec mise sous séquestre
     */
    async createLimitOrder(userId, details) {
        const { ticker, type, quantity, limitPrice } = details;
        const totalAmount = quantity * limitPrice;

        return db.transaction(async (tx) => {
            const wallet = await tx('wallets').where({ user_id: userId }).forUpdate().first();
            if (!wallet) throw new Error("Portefeuille introuvable.");

            if (type === 'BUY') {
                if (parseFloat(wallet.cash_available) < totalAmount) {
                    throw new Error(`Solvabilité insuffisante pour cet ordre limite. Requis: ${totalAmount}$, Disponible: ${wallet.cash_available}$`);
                }
                // Mise sous séquestre du cash
                await tx('wallets').where({ id: wallet.id }).update({
                    cash_available: parseFloat(wallet.cash_available) - totalAmount,
                    updated_at: new Date()
                });
            } else if (type === 'SELL') {
                const existingPos = await tx('positions').where({ user_id: userId, ticker }).first();
                if (!existingPos || parseFloat(existingPos.quantity) < quantity) {
                    throw new Error("Quantité d'actions insuffisante pour cet ordre limite de vente.");
                }
                // Mise sous séquestre des actions
                const newQty = parseFloat(existingPos.quantity) - quantity;
                if (newQty === 0) {
                    await tx('positions').where({ id: existingPos.id }).del();
                } else {
                    await tx('positions').where({ id: existingPos.id }).update({
                        quantity: newQty,
                        updated_at: new Date()
                    });
                }
            } else {
                throw new Error("Le type d'ordre doit être BUY ou SELL.");
            }

            const [orderId] = await tx('orders').insert({
                id: crypto.randomUUID(),
                user_id: userId,
                ticker,
                type, // BUY / SELL
                side: 'LIMIT',
                limit_price: limitPrice,
                quantity,
                status: 'PENDING',
                created_at: new Date()
            }).returning('id');

            return { orderId: orderId.id || orderId, ticker, status: 'PENDING', quantity, limitPrice };
        });
    }

    async executeMarketOrder(userId, details) {
        const { ticker, type, quantity, isLimitOrder, originalOrderId, forcedPrice } = details;

        // 1. Récupérer le prix (depuis Redis ou forcé par le déclencheur de limite)
        let executedPrice;
        if (forcedPrice) {
            executedPrice = forcedPrice;
        } else {
            const quotes = await quoteService.getQuote(ticker);
            executedPrice = type === 'BUY' ? quotes.ask : quotes.bid;
        }

        const totalAmount = executedPrice * quantity;

        return db.transaction(async (tx) => {
            // 2. Verrouiller le portefeuille pour éviter les accès concurrents (Race Conditions)
            const wallet = await tx('wallets').where({ user_id: userId }).forUpdate().first();
            if (!wallet) throw new Error("Portefeuille introuvable.");

            // 3. Gestion de l'enregistrement de l'ordre (si ce n'est pas une limite déjà existante)
            let orderId = originalOrderId;
            if (!isLimitOrder) {
                orderId = crypto.randomUUID();
                await tx('orders').insert({
                    id: orderId,
                    user_id: userId,
                    ticker,
                    type,
                    side: 'MARKET',
                    quantity,
                    status: 'COMPLETED',
                    limit_price: executedPrice,
                    created_at: new Date()
                });
            } else {
                // Si c'est un ordre limite qui vient d'être touché, on met à jour son statut
                await tx('orders').where({ id: orderId }).update({
                    status: 'COMPLETED',
                    updated_at: new Date()
                });
            }

            if (type === 'BUY') {
                // VÉRIFICATION SOLVABILITÉ
                if (parseFloat(wallet.cash_available) < totalAmount) {
                    throw new Error(`Solvabilité insuffisante. Requis: ${totalAmount}$, Disponible: ${wallet.cash_available}$`);
                }

                // DÉBIT DU CASH
                await tx('wallets').where({ id: wallet.id }).update({
                    cash_available: parseFloat(wallet.cash_available) - totalAmount,
                    updated_at: new Date()
                });

                // GESTION DE LA POSITION (Table 'positions' selon ton rapport)
                const existingPos = await tx('positions').where({ user_id: userId, ticker }).first();
                if (existingPos) {
                    // Recalcul du PUMP (Prix Unitaire Moyen Pondéré)
                    const oldQty = parseFloat(existingPos.quantity);
                    const oldPump = parseFloat(existingPos.average_purchase_price);
                    const newQty = oldQty + quantity;
                    const newPump = ((oldQty * oldPump) + (quantity * executedPrice)) / newQty;

                    await tx('positions').where({ id: existingPos.id }).update({
                        quantity: newQty,
                        average_purchase_price: newPump,
                        updated_at: new Date()
                    });
                } else {
                    await tx('positions').insert({
                        id: crypto.randomUUID(),
                        user_id: userId,
                        ticker,
                        quantity,
                        average_purchase_price: executedPrice,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            } else {
                // LOGIQUE DE VENTE (SELL)
                const existingPos = await tx('positions').where({ user_id: userId, ticker }).first();
                if (!existingPos || parseFloat(existingPos.quantity) < quantity) {
                    throw new Error("Quantité d'actions insuffisante pour la vente.");
                }

                const newQty = parseFloat(existingPos.quantity) - quantity;

                if (newQty === 0) {
                    await tx('positions').where({ id: existingPos.id }).del();
                } else {
                    await tx('positions').where({ id: existingPos.id }).update({
                        quantity: newQty,
                        updated_at: new Date()
                    });
                }

                // CRÉDIT DU CASH
                await tx('wallets').where({ id: wallet.id }).update({
                    cash_available: parseFloat(wallet.cash_available) + totalAmount,
                    updated_at: new Date()
                });
            }

            // 4. Journalisation de la transaction (Table 'transactions')
            await tx('transactions').insert({
                id: crypto.randomUUID(),
                order_id: orderId,
                ticker,
                execution_price: executedPrice,
                quantity,
                executed_at: new Date()
            });

            console.log(`[OrderEngine] Ordre ${type} réussi pour ${userId}: ${quantity} ${ticker} @ ${executedPrice}`);
            return { orderId, executedPrice, quantity, totalAmount };
        });
    }

    /**
     * Annule un ordre Limite en attente (PENDING)
     */
    async cancelLimitOrder(userId, orderId) {
        return db.transaction(async (tx) => {
            const order = await tx('orders')
                .where({ id: orderId, user_id: userId, side: 'LIMIT' })
                .forUpdate()
                .first();

            if (!order) {
                throw new Error("Ordre introuvable ou permission refusée.");
            }

            if (order.status !== 'PENDING') {
                throw new Error(`Impossible d'annuler cet ordre (Statut: ${order.status}). Seuls les ordres PENDING peuvent être annulés.`);
            }

            const wallet = await tx('wallets').where({ user_id: userId }).forUpdate().first();
            const quantity = parseFloat(order.quantity);

            // Restitution du séquestre
            if (order.type === 'BUY') {
                const refund = quantity * parseFloat(order.limit_price);
                await tx('wallets').where({ id: wallet.id }).update({
                    cash_available: parseFloat(wallet.cash_available) + refund,
                    updated_at: new Date()
                });
            } else if (order.type === 'SELL') {
                const existingPos = await tx('positions').where({ user_id: userId, ticker: order.ticker }).first();
                if (existingPos) {
                    await tx('positions').where({ id: existingPos.id }).update({
                        quantity: parseFloat(existingPos.quantity) + quantity,
                        updated_at: new Date()
                    });
                } else {
                    await tx('positions').insert({
                        id: crypto.randomUUID(),
                        user_id: userId,
                        ticker: order.ticker,
                        quantity: quantity,
                        average_purchase_price: 0, // valeur par défaut car le PUMP historique a été effacé
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            }

            await tx('orders').where({ id: order.id }).update({
                status: 'CANCELLED',
                updated_at: new Date()
            });

            return { message: "Ordre annulé avec succès.", orderId: order.id, status: 'CANCELLED' };
        });
    }
}

module.exports = new OrderEngine();