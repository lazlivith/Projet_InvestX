// d:\investx_X\backend\src\config\db.js
const knex = require('knex');
require('dotenv').config();

const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    } : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'investx_db',
    },
    pool: {
        min: 2,
        max: 10
    }
});

// Test de connexion simple au démarrage
db.raw('SELECT 1')
    .then(() => console.log('🐘 Connexion réussie à la base PostgreSQL (investx_db)'))
    .catch((err) => {
        console.error('❌ Erreur de connexion PostgreSQL :', err.message);
        process.exit(1);
    });

module.exports = db;
