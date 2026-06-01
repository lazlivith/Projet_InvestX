const WebSocket = require('ws');
const quoteService = require('../services/quoteService');
const { getIO } = require('../config/socket');
const orderEngine = require('../services/orderEngine');
const alertService = require('../services/alertService');

let reconnectAttempts = 0;

const connectFinnhub = () => {
    const apiKey = process.env.FINNHUB_KEY;
    if (!apiKey) {
        console.error("❌ Erreur : FINNHUB_KEY est manquante dans le fichier .env");
        return;
    }

    // Sécurité anti-spam pour éviter l'erreur 429 au démarrage/redémarrage (nodemon)
    if (reconnectAttempts === 0 && process.env.NODE_ENV !== 'production') {
        console.log('⏳ Délai de sécurité Finnhub (2s) pour éviter l\'erreur 429...');
        return setTimeout(() => { reconnectAttempts = 1; connectFinnhub(); }, 2000);
    }

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    ws.on('open', () => {
        console.log('🌐 Connexion établie avec le flux WebSocket de Finnhub');
        reconnectAttempts = 0; // Réinitialisation en cas de succès

        // Liste des Tickers de démonstration à suivre automatiquement au démarrage
        const tickersToWatch = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];

        tickersToWatch.forEach(ticker => {
            ws.send(JSON.stringify({ 'type': 'subscribe', 'symbol': ticker }));
        });
    });

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);

            // Finnhub envoie les données de transaction sous le type 'trade'
            if (message.type === 'trade') {
                const trades = message.data;

                for (const trade of trades) {
                    const ticker = trade.s;    // Symbole de l'actif (ex: AAPL)
                    const lastPrice = trade.p; // Dernier prix de transaction (LAST)

                    // Finnhub fournit le prix de la dernière transaction via son WebSocket.
                    // Pour simuler le Spread Bancaire (BID / ASK) de manière réaliste :
                    const mockSpread = lastPrice * 0.0005; // 0.05% de spread
                    const bidPrice = lastPrice - mockSpread;
                    const askPrice = lastPrice + mockSpread;

                    // 1. Mettre à jour le cache Redis instantanément pour l'Order Engine
                    await quoteService.updateQuote(ticker, bidPrice, askPrice, lastPrice);

                    // 1.5 Traiter les ordres limites potentiels pour ce ticker
                    await orderEngine.processLimitOrders(ticker, bidPrice, askPrice);

                    // 1.6 Vérifier les alertes de prix
                    await alertService.checkPriceAlerts(ticker, lastPrice);

                    // 2. Propulser la mise à jour en temps réel uniquement aux clients React abonnés à ce Ticker
                    try {
                        const io = getIO();
                        io.to(ticker).emit('priceUpdate', {
                            ticker,
                            bid: bidPrice.toFixed(4),
                            ask: askPrice.toFixed(4),
                            last: lastPrice.toFixed(4),
                            timestamp: trade.t
                        });
                    } catch (ioError) {
                        // Évite de faire crasher le worker si Socket.io n'est pas encore prêt
                    }
                }
            }
        } catch (err) {
            console.error('❌ Erreur de traitement du message Finnhub :', err.message);
        }
    });

    ws.on('error', (error) => {
        console.error('❌ Erreur sur le WebSocket Finnhub :', error.message);
    });

    ws.on('close', () => {
        const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 60000); // Max 1 minute
        console.log(`⚠️ Flux Finnhub déconnecté. Tentative de reconnexion dans ${delay / 1000} secondes...`);
        reconnectAttempts++;
        setTimeout(connectFinnhub, delay);
    });
};

module.exports = { connectFinnhub };
