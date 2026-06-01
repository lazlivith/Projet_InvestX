const knex = require('knex');
require('dotenv').config();

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'investx_db',
    },
    pool: {
        min: 2,
        max: 10 // Ajustable selon la charge pour éviter de saturer Postgres
    }
});

// Test de connexion immédiat au démarrage et création de tables manquantes
db.raw('SELECT 1')
    .then(async () => {
        console.log('🐘 Connexion réussie à la base PostgreSQL (investx_db)');

        // Création de la table users si elle n'existe pas
        const hasUsers = await db.schema.hasTable('users');
        if (!hasUsers) {
            await db.schema.createTable('users', (table) => {
                table.uuid('id').primary();
                table.string('name').notNullable();
                table.string('email').unique().notNullable();
                table.string('password').notNullable();
                table.string('role').defaultTo('client');
                table.boolean('is_active').defaultTo(true);
                table.timestamps(true, true);
            });
            console.log('✅ Table users créée avec succès.');
        }

        // Création de la table wallets (portefeuilles) si elle n'existe pas
        const hasWallets = await db.schema.hasTable('wallets');
        if (!hasWallets) {
            await db.schema.createTable('wallets', (table) => {
                table.uuid('id').primary();
                table.uuid('user_id')
                    .references('id')
                    .inTable('users')
                    .onDelete('CASCADE')
                    .notNullable();
                table.decimal('cash_available', 14, 2).defaultTo(100000.00);
                table.string('currency', 3).defaultTo('USD');
                table.timestamps(true, true);
            });
            console.log('✅ Table wallets créée avec succès.');
        }

        // Création de la table alerts si elle n'existe pas
        const hasAlerts = await db.schema.hasTable('alerts');
        if (!hasAlerts) {
            await db.schema.createTable('alerts', (table) => {
                table.uuid('id').primary();
                table.uuid('user_id').notNullable();
                table.string('ticker').notNullable();
                table.decimal('target_price', 14, 4).notNullable();
                table.string('direction').notNullable(); // 'UP' ou 'DOWN'
                table.boolean('is_active').defaultTo(true);
                table.timestamps(true, true);
            });
            console.log('✅ Table alerts créée avec succès.');
        } else {
            // Check if condition column exists and rename it to direction
            const hasCondition = await db.schema.hasColumn('alerts', 'condition');
            if (hasCondition) {
                await db.schema.alterTable('alerts', (table) => {
                    table.renameColumn('condition', 'direction');
                });
                console.log('✅ Colonne condition renommée en direction dans la table alerts.');
            }
        }

        // Création de la table notifications si elle n'existe pas
        const hasNotifications = await db.schema.hasTable('notifications');
        if (!hasNotifications) {
            await db.schema.createTable('notifications', (table) => {
                table.uuid('id').primary();
                table.uuid('user_id').notNullable();
                table.string('title').notNullable();
                table.text('message').notNullable();
                table.boolean('is_read').defaultTo(false);
                table.timestamps(true, true);
            });
            console.log('✅ Table notifications créée avec succès.');
        }

        // Création de la table exchange_rates si elle n'existe pas
        const hasExchangeRates = await db.schema.hasTable('exchange_rates');
        if (!hasExchangeRates) {
            await db.schema.createTable('exchange_rates', (table) => {
                table.string('base_currency', 3).notNullable();
                table.string('target_currency', 3).notNullable();
                table.decimal('rate', 14, 6).notNullable();
                table.timestamps(true, true);
                table.primary(['base_currency', 'target_currency']);
            });
            console.log('✅ Table exchange_rates créée avec succès.');
        }

        // Création de la table orders pour les ordres MARKET et LIMIT
        const hasOrders = await db.schema.hasTable('orders');
        if (!hasOrders) {
            await db.schema.createTable('orders', (table) => {
                table.uuid('id').primary();
                table.uuid('user_id').notNullable();
                table.string('ticker').notNullable();
                table.string('type').notNullable(); // BUY, SELL
                table.string('side').notNullable(); // MARKET, LIMIT
                table.decimal('limit_price', 14, 4);
                table.decimal('quantity', 14, 8).notNullable();
                table.string('status').defaultTo('PENDING'); // PENDING, COMPLETED, CANCELLED
                table.timestamps(true, true);
            });
            console.log('✅ Table orders créée avec succès.');
        }

        // Création de la table positions pour le calcul du PUMP
        const hasPositions = await db.schema.hasTable('positions');
        if (!hasPositions) {
            await db.schema.createTable('positions', (table) => {
                table.uuid('id').primary();
                table.uuid('user_id').notNullable();
                table.string('ticker').notNullable();
                table.decimal('quantity', 14, 8).notNullable();
                table.decimal('average_purchase_price', 14, 4).notNullable();
                table.timestamps(true, true);
                table.unique(['user_id', 'ticker']);
            });
            console.log('✅ Table positions créée avec succès.');
        }

        // Création de la table transactions pour l'historique (Cahier des charges)
        const hasTransactions = await db.schema.hasTable('transactions');
        if (!hasTransactions) {
            await db.schema.createTable('transactions', (table) => {
                table.uuid('id').primary();
                table.uuid('order_id').references('id').inTable('orders');
                table.string('ticker').notNullable();
                table.decimal('execution_price', 14, 4).notNullable();
                table.decimal('quantity', 14, 8).notNullable();
                table.timestamp('executed_at').defaultTo(db.fn.now());
            });
            console.log('✅ Table transactions créée avec succès.');
        }

        // Ajout de la colonne is_active sur users si elle n'existe pas
        const hasIsActive = await db.schema.hasColumn('users', 'is_active');
        if (!hasIsActive) {
            await db.schema.table('users', (table) => {
                table.boolean('is_active').defaultTo(true).notNullable();
            });
            // Mettre tous les users existants à actif
            await db('users').update({ is_active: true });
            console.log('✅ Colonne is_active ajoutée à la table users.');
        }
    })
    .catch((err) => {
        console.error('❌ Erreur de connexion ou d\'initialisation PostgreSQL :', err.message);
        process.exit(1);
    });

module.exports = db;
