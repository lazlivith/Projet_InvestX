import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/app/services/api';
import { toast } from 'sonner';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';
import { ConfirmModal } from './AdminShared';

export function AlertsTab() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; ticker: string } | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAlerts();
      setAlerts(res.data);
    } catch {
      toast.error('Erreur lors de la récupération des alertes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const confirmDelete = async () => {
    if (!confirm) return;
    try {
      await adminAPI.deleteAlert(confirm.id);
      toast.success(`Alerte ${confirm.ticker} supprimée`);
      fetchAlerts();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setConfirm(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {confirm && (
        <ConfirmModal
          message={`Supprimer l'alerte ${confirm.ticker} ? Cette action est irréversible.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      <h2 className="text-xl font-semibold mb-4">Modération des Alertes</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Ticker</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Prix Cible</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                <td className="p-3 text-gray-400">{a.user_email}</td>
                <td className="p-3 font-bold text-white">{a.ticker}</td>
                <td className="p-3 text-gray-300">{a.condition_type || a.condition || a.direction}</td>
                <td className="p-3 font-mono text-yellow-400">${a.target_price}</td>
                <td className="p-3">
                  {a.is_active
                    ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="size-3" />Active</span>
                    : <span className="flex items-center gap-1 text-gray-500 text-xs"><XCircle className="size-3" />Inactive</span>}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setConfirm({ id: a.id, ticker: a.ticker })}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucune alerte trouvée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
