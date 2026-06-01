const express = require('express');
const http = require('http'); // Requis pour coupler Express et Socket.io
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Initialisation de la base et du cache
const db = require('./config/db');
const redisClient = require('./config/redis');

// Importations Temps Réel & Sécurité & NLP
const { initSocket } = require('./config/socket');
const { connectFinnhub } = require('./workers/finnhubWorker');
const authController = require('./controllers/authController');
const tradeController = require('./controllers/tradeController');
const portfolioController = require('./controllers/portfolioController');
const newsController = require('./controllers/newsController');
const userController = require('./controllers/userController');
const adminController = require('./controllers/adminController');
const runExchangeRateWorker = require('./workers/exchangeRateWorker');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('./middlewares/authMiddleware');

const app = express();
const server = http.createServer(app); // Création du serveur HTTP
let PORT = parseInt(process.env.PORT || 5000);

// Initialisation du serveur Socket.io lié à notre serveur HTTP
initSocket(server);

app.use(helmet());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// --- ROUTES AUTHENTIFICATION ---
app.post('/api/v1/auth/register', authController.register);
app.post('/api/v1/auth/login', authController.login);
app.post('/api/v1/auth/refresh', authController.refresh);

// --- ROUTE DE TRADING SÉCURISÉE (CLIENT) ---
app.post('/api/v1/trade/market-order', authenticateToken, tradeController.handleMarketOrder);
app.post('/api/v1/trade/limit-order', authenticateToken, tradeController.handleLimitOrder);
app.post('/api/v1/trade/cancel-order', authenticateToken, tradeController.cancelOrder);
app.get('/api/v1/trade/quote/:ticker', authenticateToken, tradeController.getQuote);

// --- ROUTE PORTFOLIO (SÉCURISÉE) ---
app.get('/api/v1/portfolio', authenticateToken, portfolioController.getDashboardSummary);

// --- ROUTE EXPERT : NLP ANALYSE DE SENTIMENT (BONUS B) ---
app.post('/api/v1/analytics/sentiment', authenticateToken, newsController.analyzeNewsMetrics);

// --- ROUTES UTILISATEUR (GESTION DE PROFIL) ---
app.get('/api/v1/users/me', authenticateToken, userController.getMe);  // Synchronisation du rôle depuis la DB
app.get('/api/v1/users/profile', authenticateToken, userController.getProfile);
app.put('/api/v1/users/profile', authenticateToken, userController.updateProfile);

// --- ACCÈS SÉCURISÉ : DASHBOARD CLIENT ---
app.get('/api/v1/client/dashboard', authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Bienvenue sur l'espace privé du Dashboard Client !",
        userId: req.user.id,
        role: req.user.role
    });
});

// --- ACCÈS SÉCURISÉ : DASHBOARD ADMIN ---
app.get('/api/v1/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
    res.status(200).json({
        message: "Accès autorisé. Bienvenue sur le Panneau de Contrôle Admin d'InvestX."
    });
});
app.get('/api/v1/admin/users', authenticateToken, requireAdmin, adminController.getAllUsers);
app.put('/api/v1/admin/users/:id', authenticateToken, requireAdmin, adminController.updateUser);
app.get('/api/v1/admin/alerts', authenticateToken, requireAdmin, adminController.getAllAlerts);
app.delete('/api/v1/admin/alerts/:alertId', authenticateToken, requireAdmin, adminController.deleteAnyAlert);
app.get('/api/v1/admin/transactions', authenticateToken, requireAdmin, adminController.getTransactionLogs);
app.get('/api/v1/admin/stats', authenticateToken, requireAdmin, adminController.getPlatformStats);

// Route Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", message: "Moteur Temps Réel Finnhub & Socket.io activés." });
});

// Lancement du serveur global
const startServer = (port) => {
    server.listen(port, () => {
        console.log(`🚀 Serveur InvestX complet lancé sur le port ${PORT}`);
        // Démarrage des workers après le lancement réussi du serveur
        connectFinnhub();
        runExchangeRateWorker();
    });
};

// Gestion propre de l'erreur d'adresse déjà utilisée
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Erreur : Le port ${PORT} est déjà utilisé.`);
        console.info(`💡 Astuce : Exécute 'taskkill /F /IM node.exe' pour libérer le port 5000.`);
        process.exit(1);
    } else {
        console.error(`❌ Erreur serveur :`, error);
        process.exit(1);
    }
});

startServer(PORT);
