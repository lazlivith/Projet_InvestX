import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
    id: string;
    executed_at: string;
    side: string;
    ticker: string;
    quantity: number;
    execution_price: string;
}

const ActivityPage: React.FC = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                // Adjust if your endpoint is different
                const response = await api.get('/admin/transactions');
                setActivities(response.data.data || response.data);
            } catch (err) {
                console.error("Erreur lors du chargement de l'activité", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, []);

    if (loading) return <div className="p-8 text-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="p-6 h-full flex flex-col text-white">
            <h1 className="text-2xl font-bold mb-6">Activité Récente</h1>

            {activities.length === 0 ? (
                <div className="bg-[#0f0f23] p-8 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-500 italic">Aucune activité récente trouvée.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-[#0f0f23] rounded-xl border border-gray-800">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase bg-[#1a1a2e]">
                                <th className="py-4 px-6 font-medium">Date</th>
                                <th className="py-4 px-6 font-medium">Action</th>
                                <th className="py-4 px-6 font-medium">Ticker</th>
                                <th className="py-4 px-6 font-medium text-right">Quantité</th>
                                <th className="py-4 px-6 font-medium text-right">Prix d'exécution</th>
                                <th className="py-4 px-6 font-medium text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((item) => {
                                const total = (parseFloat(item.quantity.toString()) * parseFloat(item.execution_price)).toFixed(2);
                                return (
                                <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                    <td className="py-4 px-6 text-sm text-gray-400 whitespace-nowrap">
                                        {format(new Date(item.executed_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${item.side === 'BUY' || (item as any).type === 'BUY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {item.side === 'BUY' || (item as any).type === 'BUY' ? 'ACHAT' : 'VENTE'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 font-bold text-white">{item.ticker}</td>
                                    <td className="py-4 px-6 text-gray-300 text-right font-mono">{item.quantity}</td>
                                    <td className="py-4 px-6 font-mono text-sm text-gray-400 text-right">${parseFloat(item.execution_price).toFixed(2)}</td>
                                    <td className="py-4 px-6 text-right font-bold text-blue-400 font-mono">
                                        ${total}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ActivityPage;
