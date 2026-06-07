const db = require('./db');

async function initializeDatabase() {
    try {
        console.log("🛠️ Vérification et mise en conformité des tables SQL...");

        // 1. Table Utilisateurs (avec preferred_currency demandée pour la gestion des devises)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'client',
                avatar_url VARCHAR(255),
                preferred_currency VARCHAR(3) DEFAULT 'USD',
                is_active BOOLEAN DEFAULT TRUE, -- Ajouté pour adminController
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
        `);

        // 2. Table Wallets (Portefeuilles)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS wallets (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                cash_balance NUMERIC(15, 4) DEFAULT 100000.0000,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Table Portfolio Assets (Positions / PUMP)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS portfolio_assets (
                id BIGSERIAL PRIMARY KEY,
                wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
                ticker VARCHAR(10) NOT NULL,
                quantity NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
                pump NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Ajouté pour complétude
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(wallet_id, ticker)
            );
        `);

        // 4. Table Orders (Gestion du statut 'pending' pour les Ordres Limites)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS orders (
                id BIGSERIAL PRIMARY KEY,
                wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
                ticker VARCHAR(10) NOT NULL,
                side VARCHAR(10) NOT NULL, 
                type VARCHAR(10) NOT NULL, 
                status VARCHAR(20) DEFAULT 'pending', 
                target_price NUMERIC(15, 4), 
                quantity NUMERIC(15, 4) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT orders_side_check CHECK (side IN ('buy', 'sell')),
                CONSTRAINT orders_type_check CHECK (type IN ('market', 'limit')),
                CONSTRAINT orders_status_check CHECK (status IN ('pending', 'executed', 'cancelled'))
            );
        `);

        // 5. Table Transactions (Liaison exacte avec order_id BIGINT pour éliminer le bug de l'id undefined)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
                order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
                ticker VARCHAR(10) NOT NULL,
                side VARCHAR(10) NOT NULL,
                quantity NUMERIC(15, 4) NOT NULL,
                price_per_unit NUMERIC(15, 4) NOT NULL,
                total_amount NUMERIC(15, 4) NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT transactions_side_check CHECK (side IN ('buy', 'sell'))
            );
        `);

        // 7. Table des Alertes (pour les notifications de prix)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS alerts (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                ticker VARCHAR(10) NOT NULL,
                target_price NUMERIC(15, 4) NOT NULL,
                direction VARCHAR(4) NOT NULL, -- 'UP' ou 'DOWN'
                is_active BOOLEAN DEFAULT TRUE,
                triggered_at TIMESTAMP WITH TIME ZONE, -- Ajouté pour alertRepository
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT alerts_direction_check CHECK (direction IN ('UP', 'DOWN'))
            );
        `);

        // 8. Table des Taux de Change (pour la conversion multi-devises)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS exchange_rates (
                base_currency VARCHAR(3) NOT NULL,
                target_currency VARCHAR(3) NOT NULL,
                rate NUMERIC(15, 6) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (base_currency, target_currency)
            );
        `);

        // 9. Table des Notifications (pour les messages aux utilisateurs)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS notifications (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Index de performance pour les requêtes du Dashboard (évite les ralentissements en fin de projet)
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_portfolio_assets_wallet_id ON portfolio_assets(wallet_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_orders_wallet_id ON orders(wallet_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_orders_status_ticker ON orders(status, ticker);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_transactions_side ON transactions(side);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_alerts_ticker_active ON alerts(ticker, is_active);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
        await db.raw(`CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_wallet_id ON portfolio_snapshots(wallet_id);`);

        // 6. Table Snapshots (Pour ton graphique temporel demandé au tableau de bord)
        await db.raw(`
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                id BIGSERIAL PRIMARY KEY,
                wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
                cash_value NUMERIC(15, 4) NOT NULL,
                assets_value NUMERIC(15, 4) NOT NULL,
                total_equity NUMERIC(15, 4) NOT NULL,
                snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("🐘 Base de données InvestX alignée à 100% avec le cahier des charges.");
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation SQL :", error.message);
    }
}

module.exports = initializeDatabase;