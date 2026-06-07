import React, { useEffect, useState } from 'react';
import api from '../../../services/api';

const UserProfile = () => {
    // CORRECTION CRITIQUE : Objet initial vide pour éviter le crash de rendu 'Cannot read properties of null'
    const [user, setUser] = useState({ name: '', email: '', preferred_currency: 'USD', role: 'client' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // États pour le formulaire d'édition
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [preferredCurrency, setPreferredCurrency] = useState('USD');
    const [isEditing, setIsEditing] = useState(false);
    const [updateMessage, setUpdateMessage] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await api.get('/users/profile');
                const data = response.data;

                // On extrait les données (s'adapte que le backend renvoie { user } ou directement l'objet)
                const userData = data.user || data;
                setUser(userData);
                setName(userData.name || '');
                setAvatarUrl(userData.avatar_url || '');
                setPreferredCurrency(userData.preferred_currency || 'USD');
            } catch (err) {
                setError(err.response?.data?.error || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, []);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setError(null);
        setUpdateMessage(null);
        try {
            // CORRECTION PAYLOAD : Envoi du package complet pour validation côté Node.js
            const response = await api.put('/users/profile', {
                name: name,
                avatar_url: avatarUrl || null,
                preferred_currency: preferredCurrency
            });

            const updatedData = response.data.user || response.data;
            setUser(updatedData);
            setUpdateMessage("Profil mis à jour avec succès !");
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 text-white rounded-xl shadow-lg p-8 m-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-2xl font-bold tracking-wide text-slate-100">Mon Profil FinTech</h2>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase rounded-full">
                    {user.role || 'Client'}
                </span>
            </div>

            {/* Alertes d'Erreur Générale */}
            {error && (
                <div className="p-4 rounded-lg mb-6 text-sm border bg-rose-500/10 border-rose-500/30 text-rose-400">
                    Erreur : {error}
                </div>
            )}

            {/* Alerte de Succès */}
            {updateMessage && (
                <div className="p-4 rounded-lg mb-6 text-sm border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    {updateMessage}
                </div>
            )}

            <div className="space-y-6">
                {/* Section Avatar Visuelle */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="size-24 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-inner">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-slate-500">
                                {user.name?.substring(0, 1).toUpperCase()}
                            </span>
                        )}
                    </div>
                    {isEditing && (
                        <div className="w-full max-w-xs text-center">
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">URL de l'image de profil</label>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://votre-image.com/photo.jpg"
                                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* Champ Nom complet */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nom complet</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-emerald-500 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        />
                    ) : (
                        <p className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                            {user.name}
                        </p>
                    )}
                </div>

                {/* Champ Email (Lecture seule par sécurité) */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Adresse Email</label>
                    <p className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed">
                        {user.email}
                    </p>
                </div>

                {/* Sélecteur de Devise Préférée */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Devise de Référence (Dashboard)</label>
                    {isEditing ? (
                        <select
                            value={preferredCurrency}
                            onChange={(e) => setPreferredCurrency(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-emerald-500 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        >
                            <option value="USD">USD ($) - Dollar Américain</option>
                            <option value="EUR">EUR (€) - Euro</option>
                            <option value="MAD">MAD (Dh) - Dirham Marocain</option>
                        </select>
                    ) : (
                        <p className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-semibold tracking-wider">
                            {user.preferred_currency || 'USD'}
                        </p>
                    )}
                </div>

                {/* Barre d'actions */}
                <div className="flex justify-end pt-4 border-t border-slate-800 gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => {
                                    setName(user.name || '');
                                    setAvatarUrl(user.avatar_url || '');
                                    setPreferredCurrency(user.preferred_currency || 'USD');
                                    setIsEditing(false);
                                }}
                                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleUpdateProfile}
                                disabled={loading}
                                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                        >
                            Modifier le profil
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;