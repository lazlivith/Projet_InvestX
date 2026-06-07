const profileService = require('../services/profileService');
const userRepository = require('../repositories/userRepository');

class UserController {
    // Retourne le profil frais depuis la DB (synchronisation du rôle après rechargement)
    async getMe(req, res) {
        try {
            const userId = req.user.id;
            const user = await userRepository.findById(userId);
            if (!user) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }
            res.status(200).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url || null,
                preferred_currency: user.preferred_currency,
            });
        } catch (error) {
            console.error("❌ Erreur getMe :", error.message);
            res.status(500).json({ error: "Erreur lors de la récupération du profil." });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.id; // Récupéré du middleware JWT
            const profile = await profileService.getUserProfile(userId);
            res.status(200).json(profile);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { name, email, avatar_url, preferred_currency } = req.body; // avatar_url peut être null pour supprimer
            const updatedProfile = await profileService.updateProfile(userId, name, email, avatar_url, preferred_currency);
            res.status(200).json({ message: 'Profile updated successfully.', user: updatedProfile });
        } catch (error) {
            if (error.message.includes('Email already in use')) {
                return res.status(409).json({ error: error.message });
            }
            res.status(400).json({ error: error.message });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { old_password, new_password } = req.body;

            if (!old_password || !new_password) {
                return res.status(400).json({ error: 'Old password and new password are required.' });
            }

            const result = await profileService.changePassword(userId, old_password, new_password);
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('Invalid old password')) {
                return res.status(401).json({ error: error.message });
            }
            if (error.message.includes('New password must be at least 8 characters long')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to change password.' });
        }
    }
}

module.exports = new UserController();