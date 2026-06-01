const { createClient } = require('redis');
require('dotenv').config();

// Récupération de l'hôte et du port depuis ton .env Laravel
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

let hasLoggedRedisError = false;

const redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`,
    socket: {
        reconnectStrategy: (retries) => {
            // Limiter la reconnexion si on ne veut pas spammer la console indéfiniment
            // ou juste renvoyer un délai.
            return Math.min(retries * 100, 3000); // Retry toutes les 3s max
        }
    }
});

redisClient.on('error', (err) => {
    if (!hasLoggedRedisError) {
        console.error('❌ Erreur Redis Client : Impossible de se connecter. Assurez-vous que Redis est installé et lancé (redis-cli ping).', err.message);
        hasLoggedRedisError = true;
    }
});
redisClient.on('connect', () => {
    hasLoggedRedisError = false;
    console.log('🔴 Connecté avec succès au cache Redis');
});

// Connexion asynchrone au démarrage (on catch l'erreur pour ne pas faire crasher l'app)
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        // L'erreur est déjà attrapée par le listener 'error'
    }
})();

module.exports = redisClient;
