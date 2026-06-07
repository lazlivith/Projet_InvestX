const crypto = require('crypto');
const db = require('../config/db');

class UserRepository {
    // Trouver un utilisateur par son email (Utile pour le login)
    async findByEmail(email) {
        return db('users').where({ email }).whereNull('deleted_at').first();
    }

    // Trouver un utilisateur par son ID (Utile pour le profil ou les validations)
    async findById(id) {
        return db('users').where({ id }).whereNull('deleted_at').select('id', 'name', 'email', 'role', 'avatar_url', 'preferred_currency', 'created_at').first();
    }

    // Créer un utilisateur et lui associer immédiatement un portefeuille de 100 000 $ (Atomicité)
    async createUserWithPortfolio(name, email, passwordHash) {
        return db.transaction(async (tx) => {
            // 1. Insertion de l'utilisateur
            const [user] = await tx('users')
                .insert({
                    name: name, // Correction : 'name' au lieu de 'username'
                    email,
                    password_hash: passwordHash,
                    role: 'client',
                    preferred_currency: 'USD'
                })
                .returning(['id', 'name', 'email', 'preferred_currency', 'role']);

            // 2. Création automatique de son portefeuille fictif de 100 000 $
            await tx('wallets').insert({
                user_id: user.id,
                cash_balance: 100000.0000
            });

            return user;
        });
    }

    // Récupérer toutes les données d'un utilisateur, incluant le mot de passe (pour le changement de mot de passe)
    async findFullById(id) {
        return db('users').where({ id }).whereNull('deleted_at').first();
    }

    // Mettre à jour les détails du profil (nom, email, avatar, devise)
    async updateUserDetails(userId, name, email, avatarUrl, preferredCurrency) {
        const updateData = { updated_at: new Date() };
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
        if (preferredCurrency) updateData.preferred_currency = preferredCurrency;

        const [updatedUser] = await db('users')
            .where({ id: userId })
            .update(updateData)
            .returning(['id', 'name', 'email', 'role', 'avatar_url', 'preferred_currency']);
        return updatedUser;
    }

    // Mettre à jour uniquement le mot de passe
    async updateUserPassword(userId, hashedPassword) {
        return db('users').where({ id: userId }).update({ password_hash: hashedPassword, updated_at: new Date() });
    }

    // Mettre à jour les informations de l'utilisateur
    async updateUser(id, data) {
        const updateData = { ...data, updated_at: new Date() };
        return db('users').where({ id }).update(updateData).returning(['id', 'name', 'email']);
    }
}

module.exports = new UserRepository();
