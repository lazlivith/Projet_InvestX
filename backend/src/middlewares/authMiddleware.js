const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────────
// Hiérarchie des rôles : superadmin > admin > client
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
    superadmin: 3,
    admin: 2,
    client: 1,
};

/**
 * Vérifie si un rôle a au moins le niveau requis.
 */
const hasRole = (userRole, requiredRole) => {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware principal — Protège toutes les routes authentifiées
// ─────────────────────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: "Accès refusé. Token manquant." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Injecte { id, role } dans la requête
        next();
    } catch (error) {
        return res.status(403).json({ error: "Token invalide ou expiré." });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Admin — Autorise admin ET superadmin (niveau >= 2)
// ─────────────────────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
    if (!req.user || !hasRole(req.user.role, 'admin')) {
        return res.status(403).json({ error: "Accès interdit. Privilèges Administrateur requis." });
    }
    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware SuperAdmin — Réservé exclusivement au superadmin
// ─────────────────────────────────────────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ error: "Accès interdit. Privilèges SuperAdmin requis." });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireSuperAdmin,
    hasRole,
    ROLE_HIERARCHY,
};
