const userRepository = require('../repositories/userRepository');
const alertRepository = require('../repositories/alertRepository');
const db = require('../config/db');
const { ROLE_HIERARCHY } = require('../middlewares/authMiddleware');

// Rôles autorisés que l'on peut assigner via l'interface admin
const ASSIGNABLE_ROLES = ['client', 'admin'];

class AdminController {

    // ─────────────────────────────────────────────────────────────────────────
    // Liste tous les utilisateurs avec leur solde cash
    // ─────────────────────────────────────────────────────────────────────────
    async getAllUsers(req, res) {
        try {
            const users = await db('users')
                .leftJoin('wallets', 'users.id', 'wallets.user_id')
                .whereNull('users.deleted_at')
                .select(
                    'users.id as id',
                    'users.name',
                    'users.email',
                    'users.role',
                    'users.created_at',
                    'users.preferred_currency',
                    'wallets.cash_balance as balance'
                )
                .orderBy('users.created_at', 'desc');
            res.status(200).json(users);
        } catch (error) {
            console.error('❌ [AdminController.getAllUsers] Error:', error.message);
            res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifier le rôle ou le statut d'un utilisateur (RBAC sécurisé)
    // ─────────────────────────────────────────────────────────────────────────
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { role, is_active } = req.body;
            const requestingUser = req.user; // { id, role } depuis le JWT

            // 1. Empêcher l'auto-modification de rôle
            if (String(requestingUser.id) === String(id)) {
                return res.status(403).json({ error: "Vous ne pouvez pas modifier votre propre rôle ou statut." });
            }

            // 2. Récupérer la cible pour vérifier son rôle actuel
            const targetUser = await db('users')
                .where({ id })
                .whereNull('deleted_at')
                .select('id', 'name', 'email', 'role').first();
            if (!targetUser) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            // 3. Personne ne peut modifier un superadmin (sauf en DB directement)
            if (targetUser.role === 'superadmin') {
                return res.status(403).json({ error: "Le compte SuperAdmin ne peut pas être modifié via l'interface." });
            }

            const updateData = { updated_at: new Date() };

            // 4. Validation et autorisation du changement de rôle
            if (role !== undefined) {
                // Seul le superadmin peut promouvoir en 'admin'
                if (role === 'admin' && requestingUser.role !== 'superadmin') {
                    return res.status(403).json({ error: "Seul le SuperAdmin peut promouvoir un utilisateur en Administrateur." });
                }

                // Le rôle demandé doit être dans la liste autorisée (jamais 'superadmin' via API)
                if (!ASSIGNABLE_ROLES.includes(role)) {
                    return res.status(400).json({ error: `Rôle invalide. Rôles autorisés : ${ASSIGNABLE_ROLES.join(', ')}.` });
                }

                // Un admin ne peut pas rétrogader un autre admin (seulement le superadmin peut)
                if (targetUser.role === 'admin' && requestingUser.role !== 'superadmin') {
                    return res.status(403).json({ error: "Seul le SuperAdmin peut modifier le rôle d'un Administrateur." });
                }

                updateData.role = role;
            }

            await db('users').where({ id }).update(updateData);

            res.status(200).json({ message: `Utilisateur ${targetUser.name} mis à jour avec succès.` });
        } catch (error) {
            console.error('[AdminController.updateUser]', error.message);
            res.status(500).json({ error: "Erreur lors de la mise à jour de l'utilisateur." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Récupérer toutes les alertes actives de la plateforme
    // ─────────────────────────────────────────────────────────────────────────
    async getAllAlerts(req, res) {
        try {
            const alerts = await db('alerts')
                // Correction: Cast des IDs en TEXT pour autoriser la jointure UUID vs BIGINT
                .join('users', db.raw('CAST(alerts.user_id AS TEXT)'), '=', db.raw('CAST(users.id AS TEXT)'))
                .select(
                    'alerts.*',
                    'users.name as user_name',
                    'users.email as user_email'
                )
                .orderBy('alerts.created_at', 'desc');
            res.status(200).json(alerts);
        } catch (error) {
            console.error('❌ [AdminController.getAllAlerts] Error:', error.message);
            res.status(500).json({ error: "Erreur lors de la récupération des alertes." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Supprimer un utilisateur (Protection contre l'auto-suppression)
    // ─────────────────────────────────────────────────────────────────────────
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const requestingUser = req.user; // Injecté par authenticateToken

            // Empêcher l'admin de se supprimer lui-même
            if (String(requestingUser.id) === String(id)) {
                return res.status(403).json({ error: "Action interdite : vous ne pouvez pas supprimer votre propre compte." });
            }

            const deleted = await db('users')
                .where({ id })
                .whereNull('deleted_at')
                .update({ deleted_at: new Date(), is_active: false });

            if (!deleted) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            res.status(200).json({ message: "Utilisateur supprimé avec succès." });
        } catch (error) {
            console.error('❌ [AdminController.deleteUser] Error:', error.message);
            res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Journal d'Audit : toutes les transactions
    // ─────────────────────────────────────────────────────────────────────────
    async getAllTransactions(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 25;
            const offset = (page - 1) * limit;
            const type = req.query.type; // 'BUY' | 'SELL' | undefined
            const userId = req.query.userId;

            let query = db('transactions')
                .join('wallets', 'transactions.wallet_id', '=', 'wallets.id')
                .join('users', 'wallets.user_id', '=', 'users.id')
                .select(
                    'transactions.*',
                    'users.email as user_email',
                    'users.name as user_name',
                    'users.preferred_currency as currency'
                )
                .orderBy('executed_at', 'desc');

            if (type && ['BUY', 'SELL'].includes(type.toUpperCase())) {
                query = query.where('transactions.side', type.toLowerCase()); // Correction: filter by 'side' and use lowercase
            }

            if (userId) {
                query = query.where('users.id', userId);
            }

            // Utilisation de transactions.id pour lever l'ambiguïté SQL lors du comptage et de la sélection
            const countQuery = query.clone().clearSelect().clearOrder();
            const totalResult = await countQuery.count('transactions.id as count').first();

            const count = totalResult ? parseInt(totalResult.count) : 0;
            const transactions = await query.clone().limit(limit).offset(offset);

            res.status(200).json({
                data: transactions,
                pagination: {
                    total: parseInt(count),
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            console.error('❌ [AdminController.getAllTransactions] Error:', error.message);
            res.status(500).json({ error: "Erreur lors de la récupération des logs." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Supprimer une alerte (modération)
    // ─────────────────────────────────────────────────────────────────────────
    async deleteAnyAlert(req, res) {
        try {
            const { alertId } = req.params;
            const deleted = await db('alerts').where({ id: alertId }).del();
            if (!deleted) {
                return res.status(404).json({ error: "Alerte introuvable." });
            }
            res.status(200).json({ message: "Alerte supprimée par l'administrateur." });
        } catch (error) {
            console.error('[AdminController.deleteAnyAlert]', error.message);
            res.status(500).json({ error: "Erreur lors de la suppression de l'alerte." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Statistiques globales de la plateforme (KPI Dashboard)
    // ─────────────────────────────────────────────────────────────────────────
    async getGlobalStats(req, res) {
        try {
            const [totalUsers] = await db('users').count('id as count');
            const [totalAdmins] = await db('users').where({ role: 'admin' }).count('id as count');
            const [totalClients] = await db('users').where({ role: 'client' }).count('id as count');
            const [totalTransactions] = await db('transactions').count('id as count');
            const [volumeResult] = await db('transactions').sum('total_amount as total');
            const [totalAlerts] = await db('alerts').count('id as count');

            // Statistique du volume par jour (7 derniers jours)
            const dailyVolume = await db('transactions')
                .select(db.raw("TO_CHAR(executed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date"))
                .sum('total_amount as volume')
                .groupBy('date')
                .orderBy('date', 'desc')
                .limit(7);

            res.status(200).json({
                totalUsers: parseInt(totalUsers.count),
                totalAdmins: parseInt(totalAdmins.count),
                totalClients: parseInt(totalClients.count),
                totalTransactions: parseInt(totalTransactions.count),
                globalVolume: parseFloat(volumeResult.total) || 0,
                activeAlerts: parseInt(totalAlerts.count),
                dailyVolume: dailyVolume.map(v => ({ date: v.date, volume: parseFloat(v.volume) }))
            });
        } catch (error) {
            console.error('❌ [AdminController.getGlobalStats] Error:', error.message);
            res.status(500).json({ error: "Erreur lors du calcul des statistiques." });
        }
    }
}

module.exports = new AdminController();