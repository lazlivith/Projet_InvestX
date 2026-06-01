const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Durée de vie courte pour la sécurité
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' } // Durée de vie longue
    );
};

// Inscription (Register)
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
        }

        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "Cet email est déjà utilisé." });
        }

        // Hachage du mot de passe
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Sauvegarde en base de données avec création du portefeuille
        const newUser = await userRepository.createUserWithPortfolio(name, email, passwordHash);

        res.status(201).json({
            message: "Utilisateur enregistré avec succès.",
            user: {
                id: newUser.id,
                name: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'inscription.", details: error.message });
    }
};

// Connexion (Login)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect." });
        }

        // Génération des tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.status(200).json({
            message: "Connexion réussie.",
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.username, // Use user.username since the DB column is username
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la connexion.", details: error.message });
    }
};

// Rafraîchissement du token (Refresh Token)
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token manquant." });
        }

        // Vérification du token
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: "Refresh token invalide ou expiré." });
            }

            // Récupérer l'utilisateur pour générer le nouveau token avec ses infos à jour
            const user = await userRepository.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            const newAccessToken = generateAccessToken(user);

            res.status(200).json({
                accessToken: newAccessToken
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du rafraîchissement du token.", details: error.message });
    }
};

module.exports = {
    register,
    login,
    refresh
};
