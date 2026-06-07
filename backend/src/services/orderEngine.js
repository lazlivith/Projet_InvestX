const db = require('../config/db');
const crypto = require('crypto');
const quoteService = require('./quoteService');

class OrderEngine {
    /**
     * Résout le wallet_id à partir d'un user_id
     * Utilisé car la table 'portfolio_assets' ne contient pas de colonne user_id,
     * seulement wallet_id. On passe donc par le wallet pour identifier les positions.
     */
    async _getWalletId(txOrDb, userId) {
        const wallet = await txOrDb('wallets').where({ user_id: userId }).first();
        return wallet ? wallet.id : null;
    }

    /**
     * Traite les ordres limites en attente pour un ticker donné
     * Appelé par le FinnhubWorker à chaque mise à jour de prix
     */
    async processLimitOrders(ticker, bid, ask) {
        // 1. Récupérer les ordres "PENDING" pour ce ticker
        const pendingOrders = await db('orders')
            .join('wallets', 'orders.wallet_id', 'wallets.id')
            .where({ 'orders.ticker': ticker.toUpperCase(), 'orders.status': 'pending', 'orders.type': 'limit' })
            .select('orders.*', 'wallets.user_id');

        for (const order of pendingOrders) {
            let shouldExecute = false;
            const limitPrice = parseFloat(order.target_price);

            if (order.side.toLowerCase() === 'buy' && ask <= limitPrice) { // Correction: ensure lowercase comparison
                // Le prix a baissé jusqu'à notre limite d'achat
                shouldExecute = true;
            } else if (order.side.toLowerCase() === 'sell' && bid >= limitPrice) { // Correction: ensure lowercase comparison
                // Le prix est monté jusqu'à notre limite de vente
                shouldExecute = true;
            }

            if (shouldExecute) {
                console.log(`[OrderEngine] Déclenchement de l'ordre LIMITE ${order.id} pour ${ticker}`);
                await this.executeMarketOrder(order.user_id, {
                    ticker: order.ticker,
                    type: order.side, // buy / sell
                    quantity: order.quantity,
                    isLimitOrder: true,
                    originalOrderId: order.id,
                    forcedPrice: order.side === 'buy' ? ask : bid
                });
            }
        }
    }

    /**
     * Enregistre un ordre limite en base de données avec mise sous séquestre
     */
    async createLimitOrder(userId, details) {
        const { ticker, type: side, quantity, targetPrice } = details; // Renamed limitPrice to targetPrice
        const totalAmount = quantity * targetPrice;

        return db.transaction(async (tx) => {
            const wallet = await tx('wallets').where({ user_id: userId }).forUpdate().first();
            if (!wallet) throw new Error("Portefeuille introuvable.");

            if (side.toLowerCase() === 'buy') { // Apply toLowerCase()
                if (parseFloat(wallet.cash_balance) < totalAmount) { // Renamed cash_available to cash_balance
                    throw new Error(`Solvabilité insuffisante pour cet ordre limite. Requis: ${totalAmount}$, Disponible: ${wallet.cash_balance}$`);
                }
                // Mise sous séquestre du cash
                await tx('wallets').where({ id: wallet.id }).update({
                    cash_balance: parseFloat(wallet.cash_balance) - totalAmount, // Renamed cash_available to cash_balance
                    updated_at: new Date()
                });
            } else if (side.toLowerCase() === 'sell') { // Correction: ensure lowercase comparison
                // Recherche de la position via wallet_id
                const existingPos = await tx('portfolio_assets').where({ wallet_id: wallet.id, ticker: ticker.toUpperCase() }).first();
                if (!existingPos || parseFloat(existingPos.quantity) < quantity) {
                    throw new Error("Quantité d'actions insuffisante pour cet ordre limite de vente.");
                }
                // Mise sous séquestre des actions
                const newQty = parseFloat(existingPos.quantity) - quantity;
                if (newQty === 0) {
                    await tx('portfolio_assets').where({ id: existingPos.id }).del();
                } else {
                    await tx('portfolio_assets').where({ id: existingPos.id }).update({
                        quantity: newQty,
                        updated_at: new Date()
                    });
                }
            } else {
                throw new Error("Le type d'ordre doit être BUY ou SELL.");
            }

            const [insertedOrder] = await tx('orders').insert({ // Use insertedOrder to get the ID
                wallet_id: wallet.id,
                ticker: ticker.toUpperCase(),
                type: 'limit', // Force lowercase
                side: side.toLowerCase(),   // Force lowercase
                target_price: targetPrice, // Renamed limit_price to target_price
                quantity,
                status: 'pending' // Force lowercase
            }).returning('*');

            return {
                orderId: insertedOrder.id,
                ticker: ticker.toUpperCase(), // Assurer que le ticker est en majuscules
                status: 'pending',
                quantity,
                targetPrice,
                limitPrice: targetPrice // Alias pour le frontend
            };
        });
    }

    async executeMarketOrder(userId, details) {
        // NOTE: dans details, 'type' signifie BUY/SELL (la direction)
        // En DB: colonne 'type' = MARKET/LIMIT, colonne 'side' = BUY/SELL
        const { ticker, type: side, quantity, isLimitOrder, originalOrderId, forcedPrice } = details;

        // 1. Récupérer le prix (depuis Redis ou forcé par le déclencheur de limite)
        let executedPrice;
        if (forcedPrice) {
            executedPrice = forcedPrice;
        } else { //
            const quotes = await quoteService.getQuote(ticker);
            executedPrice = side.toLowerCase() === 'buy' ? quotes.ask : quotes.bid; // Already correct
        }

        const totalAmount = parseFloat((executedPrice * quantity).toFixed(2));

        console.log(`[OrderEngine] DEBUG - Exécution Ordre: userId=${userId}, ticker=${ticker}, side=${side}, quantity=${quantity}`);
        console.log(`[OrderEngine] DEBUG - Prix exécuté: ${executedPrice}, Montant total: ${totalAmount}`);
        console.log(`[OrderEngine] DEBUG - Est un ordre limite: ${isLimitOrder}, Ordre original ID: ${originalOrderId}`);

        try {
            return await db.transaction(async (tx) => {
                // 2. Verrouiller le portefeuille pour éviter les accès concurrents (Race Conditions)
                const wallet = await tx('wallets').where({ user_id: userId }).forUpdate().first();
                if (!wallet) throw new Error("Portefeuille introuvable.");

                // 3. Gestion de l'enregistrement de l'ordre (si ce n'est pas une limite déjà existante)
                let orderId = originalOrderId;
                if (!isLimitOrder) { //
                    const [insertedOrder] = await tx('orders').insert({ // Use insertedOrder to get the ID
                        wallet_id: wallet.id,
                        ticker: ticker.toUpperCase(),
                        type: 'market', // Force lowercase
                        side: side.toLowerCase(),     // Force lowercase
                        quantity,
                        status: 'executed',
                        target_price: executedPrice,
                    }).returning('*'); // created_at et updated_at sont gérés par la DB
                    orderId = insertedOrder.id;
                } else {
                    // Si c'est un ordre limite qui vient d'être touché, on met à jour son statut
                    await tx('orders').where({ id: orderId }).update({ //
                        status: 'executed', // Force lowercase
                        updated_at: new Date()
                    });
                }

                if (side.toLowerCase() === 'buy') { // Apply toLowerCase()
                    if (!isLimitOrder) {
                        // VÉRIFICATION SOLVABILITÉ (Seulement pour les ordres au marché)
                        if (parseFloat(wallet.cash_balance) < totalAmount) { // Renamed cash_available to cash_balance
                            console.error(`[OrderEngine] DEBUG - Solvabilité insuffisante: cash=${parseFloat(wallet.cash_balance)}, requis=${totalAmount}`);
                            throw new Error(`Solvabilité insuffisante. Requis: ${totalAmount}$, Disponible: ${wallet.cash_balance}$`);
                        }

                        // DÉBIT DU CASH
                        await tx('wallets').where({ id: wallet.id }).update({
                            cash_balance: parseFloat(wallet.cash_balance) - totalAmount, // Renamed cash_available to cash_balance
                            updated_at: new Date()
                        });
                    }

                    // GESTION DE LA POSITION — Recherche via wallet_id (pas user_id)
                    const existingPos = await tx('portfolio_assets').where({ wallet_id: wallet.id, ticker: ticker.toUpperCase() }).first();
                    if (existingPos) {
                        // Recalcul du PUMP (Prix Unitaire Moyen Pondéré)
                        const oldQty = parseFloat(existingPos.quantity);
                        const oldPump = parseFloat(existingPos.pump);
                        const newQty = oldQty + quantity;
                        const newPump = ((oldQty * oldPump) + (quantity * executedPrice)) / newQty;

                        await tx('portfolio_assets').where({ id: existingPos.id }).update({
                            quantity: newQty, //
                            pump: newPump, // Renamed average_purchase_price to pump
                            updated_at: new Date()
                        });
                    } else {
                        await tx('portfolio_assets').insert({
                            wallet_id: wallet.id,
                            ticker: ticker.toUpperCase(),
                            quantity, //
                            pump: executedPrice,
                            // created_at et updated_at sont gérés par la DB
                        });
                    }
                } else {
                    // LOGIQUE DE VENTE (SELL)
                    if (!isLimitOrder) {
                        // Recherche via wallet_id
                        const existingPos = await tx('portfolio_assets').where({ wallet_id: wallet.id, ticker: ticker.toUpperCase() }).first();
                        if (!existingPos || parseFloat(existingPos.quantity) < quantity) {
                            throw new Error("Quantité d'actions insuffisante pour la vente.");
                        }

                        const newQty = parseFloat(existingPos.quantity) - quantity;

                        if (newQty === 0) {
                            await tx('portfolio_assets').where({ id: existingPos.id }).del();
                        } else {
                            await tx('portfolio_assets').where({ id: existingPos.id }).update({ //
                                quantity: newQty,
                                updated_at: new Date()
                            });
                        }
                    }

                    // CRÉDIT DU CASH (Pour les deux types d'ordres)
                    await tx('wallets').where({ id: wallet.id }).update({
                        cash_balance: parseFloat(wallet.cash_balance) + totalAmount, // Renamed cash_available to cash_balance
                        updated_at: new Date()
                    });
                }

                // 4. Journalisation de la transaction pour l'Audit (Table 'transactions')
                // NOTE: transactions.id est bigint auto-incrémenté, ne pas envoyer d'UUID
                await tx('transactions').insert({ //
                    order_id: orderId,
                    wallet_id: wallet.id,
                    ticker: ticker.toUpperCase(),
                    side: side.toLowerCase(), // Force lowercase
                    price_per_unit: executedPrice,
                    quantity,
                    total_amount: totalAmount,
                    // executed_at et updated_at sont gérés par la DB
                });

                // Option D : Snapshotting pour le graphique temporel
                await this.createSnapshot(tx, wallet.id, parseFloat(wallet.cash_balance) + (side.toLowerCase() === 'buy' ? -totalAmount : totalAmount));

                console.log(`[OrderEngine] ✅ Ordre ${side} réussi pour ${userId}: ${quantity} ${ticker} @ ${executedPrice}`); //
                console.log(`[OrderEngine] DEBUG - Transaction réussie. Nouveau cash: ${parseFloat(wallet.cash_balance) + (side.toLowerCase() === 'buy' ? -totalAmount : totalAmount)}`);
                return {
                    orderId,
                    ticker: ticker.toUpperCase(), // Assurer que le ticker est en majuscules
                    executedPrice,
                    quantity,
                    totalAmount
                };
            });
        } catch (dbError) {
            console.error(`❌ [OrderEngine] ERREUR DB Transaction:`, dbError.message);
            console.error(`❌ [OrderEngine] Code erreur:`, dbError.code);
            console.error(`❌ [OrderEngine] Détail:`, dbError.detail || dbError.hint || 'Aucun détail');
            throw dbError; // Re-throw pour le contrôleur
        }
    }

    /**
     * Annule un ordre Limite en attente (PENDING)
     */
    async cancelLimitOrder(userId, orderId) {
        return db.transaction(async (tx) => {
            const order = await tx('orders')
                .join('wallets', 'orders.wallet_id', 'wallets.id')
                .where({ 'orders.id': orderId, 'wallets.user_id': userId, 'orders.type': 'limit' })
                .forUpdate()
                .select('orders.*', 'wallets.id as wallet_id', 'wallets.cash_balance')
                .first();

            if (!order) {
                throw new Error("Ordre introuvable ou permission refusée.");
            }

            if (order.status !== 'pending') {
                throw new Error(`Impossible d'annuler cet ordre (Statut: ${order.status}).`);
            }

            const quantity = parseFloat(order.quantity);

            // Restitution du séquestre
            if (order.side.toLowerCase() === 'buy') { // Correction: ensure lowercase comparison
                const refund = quantity * parseFloat(order.target_price);
                await tx('wallets').where({ id: order.wallet_id }).update({
                    cash_balance: parseFloat(order.cash_balance) + refund,
                    updated_at: new Date()
                });
            } else if (order.side.toLowerCase() === 'sell') { // Correction: ensure lowercase comparison
                const existingPos = await tx('portfolio_assets').where({ wallet_id: order.wallet_id, ticker: order.ticker }).first();
                if (existingPos) {
                    await tx('portfolio_assets').where({ id: existingPos.id }).update({
                        quantity: parseFloat(existingPos.quantity) + quantity,
                        updated_at: new Date()
                    }); //
                } else {
                    await tx('portfolio_assets').insert({
                        wallet_id: order.wallet_id,
                        ticker: order.ticker,
                        quantity: quantity,
                        pump: order.target_price,
                        // created_at et updated_at sont gérés par la DB
                    });
                }
            }

            await tx('orders').where({ id: order.id }).update({
                status: 'cancelled',
                updated_at: new Date()
            });

            return { message: "Ordre annulé avec succès.", orderId: order.id, status: 'cancelled' };
        });
    }

    /**
     * Crée un instantané de la valeur du compte (Snapshot)
     */
    async createSnapshot(tx, walletId, currentCash) {
        const assets = await tx('portfolio_assets').where({ wallet_id: walletId });
        let totalAssetsValue = 0;

        for (const asset of assets) {
            const quote = await quoteService.getQuote(asset.ticker);
            totalAssetsValue += parseFloat(asset.quantity) * parseFloat(quote.last);
        }

        await tx('portfolio_snapshots').insert({
            wallet_id: walletId,
            cash_value: currentCash,
            assets_value: totalAssetsValue,
            total_equity: currentCash + totalAssetsValue,
            snapshot_date: new Date()
        });
    }
}

module.exports = new OrderEngine();