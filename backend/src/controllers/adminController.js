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
                .join('wallets', 'users.id', '=', 'wallets.user_id')
                .select(
                    'users.id',
                    'users.username',
                    'users.email',
                    'users.role',
                    'users.is_active',
                    'users.created_at',
                    'wallets.cash_available',
                    'wallets.currency'
                )
                .orderBy('users.created_at', 'desc');
            res.status(200).json(users);
        } catch (error) {
            console.error('[AdminController.getAllUsers]', error.message);
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
            const targetUser = await db('users').where({ id }).select('id', 'username', 'email', 'role').first();
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

            // 5. Modification du statut actif/inactif
            if (is_active !== undefined) {
                updateData.is_active = is_active;
            }

            await db('users').where({ id }).update(updateData);

            res.status(200).json({ message: `Utilisateur ${targetUser.username} mis à jour avec succès.` });
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
                .join('users', 'alerts.user_id', '=', 'users.id')
                .select('alerts.*', 'users.email as user_email', 'users.username as user_name')
                .orderBy('alerts.created_at', 'desc');
            res.status(200).json(alerts);
        } catch (error) {
            console.error('[AdminController.getAllAlerts]', error.message);
            res.status(500).json({ error: "Erreur lors de la récupération des alertes." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Journal d'Audit : toutes les transactions
    // ─────────────────────────────────────────────────────────────────────────
    async getTransactionLogs(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 25;
            const offset = (page - 1) * limit;
            const type = req.query.type; // 'BUY' | 'SELL' | undefined

            let query = db('transactions')
                .join('wallets', 'transactions.wallet_id', '=', 'wallets.id')
                .join('users', 'wallets.user_id', '=', 'users.id')
                .select(
                    'transactions.*',
                    'users.email as user_email',
                    'users.username as user_name',
                    'wallets.currency'
                )
                .orderBy('executed_at', 'desc');

            if (type && ['BUY', 'SELL'].includes(type.toUpperCase())) {
                query = query.where('transactions.type', type.toUpperCase());
            }

            const [{ count }] = await db('transactions').count('id as count');
            const transactions = await query.limit(limit).offset(offset);

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
            console.error('[AdminController.getTransactionLogs]', error.message);
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
    async getPlatformStats(req, res) {
        try {
            const [totalUsers] = await db('users').count('id as count');
            const [totalAdmins] = await db('users').where({ role: 'admin' }).count('id as count');
            const [totalClients] = await db('users').where({ role: 'client' }).count('id as count');
            const [totalTransactions] = await db('transactions').count('id as count');
            const [volumeResult] = await db('transactions').sum('execution_price as total');
            const [totalAlerts] = await db('alerts').where({ is_active: true }).count('id as count');

            res.status(200).json({
                totalUsers: parseInt(totalUsers.count),
                totalAdmins: parseInt(totalAdmins.count),
                totalClients: parseInt(totalClients.count),
                totalTransactions: parseInt(totalTransactions.count),
                globalVolume: parseFloat(volumeResult.total) || 0,
                activeAlerts: parseInt(totalAlerts.count),
            });
        } catch (error) {
            console.error('[AdminController.getPlatformStats]', error.message);
            res.status(500).json({ error: "Erreur lors du calcul des statistiques." });
        }
    }
}

module.exports = new AdminController();