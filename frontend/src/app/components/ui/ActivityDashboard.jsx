import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../../services/api';

const ActivityDashboard = () => {
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await api.get('/portfolio/activity');
                const data = response.data;
                setActivity(data);
            } catch (err) {
                setError(err.response?.data?.error || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir annuler cet ordre ?")) return;

        try {
            await api.post('/trade/cancel-order', { orderId });

            setActivity(prev => ({
                ...prev,
                pendingOrders: prev.pendingOrders.filter(o => o.id !== orderId)
            }));
        } catch (err) {
            alert(err.message);
        }
    };

    const getStatusBadge = (status) => {
        const statusLower = status.toLowerCase();
        const baseClass = "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border";

        if (statusLower === 'pending') {
            return (
                <span className={`${baseClass} bg-amber-100 text-amber-800 border-amber-200`}>
                    <Clock size={12} /> En attente
                </span>
            );
        }
        if (statusLower === 'executed' || statusLower === 'completed') {
            return (
                <span className={`${baseClass} bg-emerald-100 text-emerald-800 border-emerald-200`}>
                    <CheckCircle size={12} /> Exécuté
                </span>
            );
        }
        if (statusLower === 'cancelled') {
            return (
                <span className={`${baseClass} bg-rose-100 text-rose-800 border-rose-200`}>
                    <XCircle size={12} /> Annulé
                </span>
            );
        }
        return null;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    if (loading) return <div className="p-8 text-center text-slate-500">Chargement de l'activité...</div>;
    if (error) return <div className="p-8 text-center text-rose-500">Erreur : {error}</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 border-slate-200 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activité & Transactions</h1>
                    <p className="text-slate-500 text-sm">Vue d'ensemble de vos ordres limites et de votre historique d'exécution</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Cash Disponible</p>
                    <p className="text-3xl font-mono font-bold text-emerald-600">{formatCurrency(activity.cashBalance)}</p>
                </div>
            </header>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock size={20} className="text-amber-500" /> Ordres en Attente (Limites)
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Ticker</th>
                                <th className="px-6 py-3 font-semibold">Type</th>
                                <th className="px-6 py-3 font-semibold">Côté</th>
                                <th className="px-6 py-3 font-semibold">Quantité</th>
                                <th className="px-6 py-3 font-semibold">Prix Cible</th>
                                <th className="px-6 py-3 font-semibold">Statut</th>
                                <th className="px-6 py-3 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activity.pendingOrders.length > 0 ? activity.pendingOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{order.ticker}</td>
                                    <td className="px-6 py-4 text-slate-600 capitalize text-sm">{order.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${order.side === 'buy' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                            {order.side.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm">{parseFloat(order.quantity).toFixed(4)}</td>
                                    <td className="px-6 py-4 font-mono text-sm">{formatCurrency(order.target_price)}</td>
                                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleCancelOrder(order.id)} className="text-rose-600 hover:text-rose-800 text-xs font-bold transition-colors">Annuler</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 italic text-sm">Aucun ordre en attente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-500" /> Historique des Transactions
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Ticker</th>
                                <th className="px-6 py-3 font-semibold">Action</th>
                                <th className="px-6 py-3 font-semibold">Quantité</th>
                                <th className="px-6 py-3 font-semibold">Prix Unit.</th>
                                <th className="px-6 py-3 font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {activity.history.length > 0 ? activity.history.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(tx.executed_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{tx.ticker}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {tx.side === 'buy' ? <ArrowDownLeft size={14} className="text-emerald-500" /> : <ArrowUpRight size={14} className="text-rose-500" />}
                                            <span className={`font-bold ${tx.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.side.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{parseFloat(tx.quantity).toFixed(4)}</td>
                                    <td className="px-6 py-4 font-mono">{formatCurrency(tx.price_per_unit)}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">{formatCurrency(tx.total_amount)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 italic">Aucune transaction passée.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ActivityDashboard;