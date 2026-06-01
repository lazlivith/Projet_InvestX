const crypto = require('crypto');
const db = require('../config/db');

class UserRepository {
    // Trouver un utilisateur par son email (Utile pour le login)
    async findByEmail(email) {
        return db('users').where({ email }).first();
    }

    // Trouver un utilisateur par son ID (Utile pour le profil ou les validations)
    async findById(id) {
        return db('users').where({ id }).select('id', 'username', 'email', 'role', 'avatar_url', 'created_at').first();
    }

    // Créer un utilisateur et lui associer immédiatement un portefeuille de 100 000 $ (Atomicité)
    async createUserWithPortfolio(name, email, passwordHash) {
        const userId = crypto.randomUUID();
        const walletId = crypto.randomUUID();

        return db.transaction(async (tx) => {
            // 1. Insertion de l'utilisateur
            const [user] = await tx('users')
                .insert({
                    id: userId,
                    username: name, // mapped to username column in db
                    email,
                    password_hash: passwordHash,
                    role: 'client', // Rôle par défaut
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .returning(['id', 'username', 'email', 'role']);

            // 2. Création automatique de son portefeuille fictif de 100 000 $
            await tx('wallets').insert({
                id: walletId,
                user_id: user.id,
                cash_available: 100000.00, // mapped to cash_available column in db
                currency: 'USD',
                created_at: new Date(),
                updated_at: new Date()
            });

            return user;
        });
    }

    // Récupérer toutes les données d'un utilisateur, incluant le mot de passe (pour le changement de mot de passe)
    async findFullById(id) {
        return db('users').where({ id }).first();
    }

    // Mettre à jour les informations de l'utilisateur
    async updateUser(id, data) {
        const updateData = { ...data, updated_at: new Date() };
        return db('users').where({ id }).update(updateData).returning(['id', 'username', 'email', 'avatar_url']);
    }
}

module.exports = new UserRepository();
