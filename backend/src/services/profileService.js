const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');

class ProfileService {
    async getUserProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found.');
        }
        // Exclure les informations sensibles comme le mot de passe et le refresh_token
        const { password, refresh_token, ...profile } = user;
        return profile;
    }

    async updateProfile(userId, name, email, avatarUrl, preferredCurrency) {
        // Validation basique
        if (!name && !email && avatarUrl === undefined && !preferredCurrency) {
            throw new Error('No valid data provided for profile update.');
        }

        // Si l'email est mis à jour, vérifier l'unicité
        if (email) {
            const existingUser = await userRepository.findByEmail(email);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email already in use by another account.');
            }
        }

        const updatedUser = await userRepository.updateUserDetails(userId, name, email, avatarUrl, preferredCurrency);
        if (!updatedUser) {
            throw new Error('Failed to update profile.');
        }
        const { password, refresh_token, ...profile } = updatedUser;
        return profile;
    }

    async changePassword(userId, oldPassword, newPassword) {
        const user = await userRepository.findById(userId);
        if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
            throw new Error('Invalid old password.');
        }
        if (newPassword.length < 8) { // Exemple de politique de mot de passe
            throw new Error('New password must be at least 8 characters long.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userRepository.updateUserPassword(userId, hashedPassword);
        return { message: 'Password updated successfully.' };
    }
}

module.exports = new ProfileService();