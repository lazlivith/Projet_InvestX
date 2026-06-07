/**
 * Script de création du compte SuperAdmin InvestX
 * ─────────────────────────────────────────────────
 * Usage : node scripts/create-superadmin.js
 *
 * Ce script est idempotent : s'il existe déjà un superadmin avec cet email,
 * il ne créera pas de doublon.
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const db = require('../src/config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration du compte SuperAdmin (modifiable selon vos besoins)
// ─────────────────────────────────────────────────────────────────────────────
const SUPERADMIN_CONFIG = {
    name: 'SuperAdmin InvestX',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@investx.com',
    password: process.env.SUPERADMIN_PASSWORD || 'NewSecureDefaultPass!', // Mettez ici un nouveau mot de passe par défaut
};

async function createSuperAdmin() {
    console.log('\n🔐 Création du compte SuperAdmin InvestX...\n');

    try {
        // Vérifier si un superadmin existe déjà
        const existing = await db('users').where({ email: SUPERADMIN_CONFIG.email }).first();

        if (existing) {
            if (existing.role === 'superadmin') {
                console.log(`✅ Un SuperAdmin existe déjà avec l'email : ${SUPERADMIN_CONFIG.email}`);
                console.log(`   Aucune modification effectuée.\n`);
                return;
            } else {
                // Promouvoir en superadmin si l'utilisateur existe avec un autre rôle
                await db('users').where({ email: SUPERADMIN_CONFIG.email }).update({
                    role: 'superadmin',
                    is_active: true, // S'assurer que le superadmin est actif
                    updated_at: new Date(),
                });
                console.log(`✅ Compte existant promu en SuperAdmin : ${SUPERADMIN_CONFIG.email}\n`);
                return;
            }
        }

        // Hacher le mot de passe
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(SUPERADMIN_CONFIG.password, saltRounds);

        // Insérer en transaction atomique
        await db.transaction(async (tx) => {
            const [user] = await tx('users').insert({
                name: SUPERADMIN_CONFIG.name,
                email: SUPERADMIN_CONFIG.email,
                password_hash: passwordHash,
                role: 'superadmin',
                preferred_currency: 'USD'
            }).returning('*');

            // Créer également un portefeuille pour le superadmin
            await tx('wallets').insert({
                user_id: user.id,
                cash_balance: 0.0000
            });
        });

        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║          ✅ SuperAdmin créé avec succès !        ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║  Email    : ${SUPERADMIN_CONFIG.email.padEnd(38)}║`);
        console.log(`║  Password : ${SUPERADMIN_CONFIG.password.padEnd(38)}║`);
        console.log(`║  Rôle     : superadmin                           ║`);
        console.log('╠══════════════════════════════════════════════════╣');
        console.log('║  ⚠️  Changez le mot de passe après la 1ère       ║');
        console.log('║      connexion en production !                   ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Erreur lors de la création du SuperAdmin :', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

createSuperAdmin();
