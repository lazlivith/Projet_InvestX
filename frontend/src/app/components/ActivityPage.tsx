import React, { useState, useEffect } from 'react';
import { tradeAPI } from '@/app/services/api'; // Utilisation du service centralisé tradeAPI
import { useAuth } from '@/app/context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface ActivityItem {
    id: string;
    executed_at: string;
    side: string; // La colonne du backend est 'side' (buy/sell)
    ticker: string;
    quantity: number;
    price_per_unit: string; // La colonne du backend est 'price_per_unit'
}

const ActivityPage: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                // On utilise une assertion de type (any) pour contourner les problèmes d'inférence
                // entre le fichier de service JS et le composant TS
                const response = await (tradeAPI as any).getUserActivity();
                setActivities(response.data.data || response.data);

            } catch (err) {
                console.error("Erreur lors du chargement de l'activité", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, []);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-[#0f0f23]">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto w-full text-white">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Clock className="text-blue-400 size-6" />
                </div>
                <h1 className="text-2xl font-bold">
                    {isAdmin ? "Journal d'Activité" : "Mon Historique de Trading"}
                </h1>
            </div>

            {activities.length === 0 ? (
                <div className="bg-[#1a1a2e] p-12 rounded-2xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-lg">
                        {isAdmin
                            ? "Veuillez consulter l'onglet Audit Global du panneau d'administration pour voir l'historique des clients."
                            : "Vous n'avez pas encore effectué de transactions."}
                    </p>
                    {!isAdmin && <p className="text-gray-600 text-sm mt-2">Vos futurs achats et ventes apparaîtront ici.</p>}
                </div>
            ) : (
                <div className="grid gap-4">
                    {activities.map((item) => {
                        const isBuy = item.side?.toUpperCase() === 'BUY';
                        const total = (parseFloat(item.quantity.toString()) * parseFloat(item.price_per_unit)).toFixed(2);

                        return (
                            <div key={item.id} className="bg-[#1a1a2e] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isBuy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {isBuy ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{item.ticker}</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${isBuy ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                                                {isBuy ? 'ACHAT' : 'VENTE'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {format(new Date(item.executed_at), 'dd MMMM yyyy, HH:mm', { locale: fr })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white">${total}</div>
                                    <div className="text-xs text-gray-400">
                                        {item.quantity} x ${parseFloat(item.price_per_unit).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActivityPage;
