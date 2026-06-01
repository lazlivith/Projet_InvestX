import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/app/services/api';
import { toast } from 'sonner';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const LIMIT = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getTransactions({ page, limit: LIMIT, type: typeFilter || undefined });
      setTransactions(res.data.data || res.data);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch {
      toast.error('Erreur lors de la récupération des transactions');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Audit Global — <span className="text-gray-400 text-base font-normal">{total} transactions</span></h2>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Tous les types</option>
            <option value="BUY">Achats (BUY)</option>
            <option value="SELL">Ventes (SELL)</option>
          </select>
          <button onClick={fetchTransactions} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors" title="Rafraîchir">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="p-3">Date</th>
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Ticker</th>
                  <th className="p-3">Quantité</th>
                  <th className="p-3">Prix d'exécution</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{new Date(t.executed_at).toLocaleString('fr-FR')}</td>
                    <td className="p-3 text-gray-300">{t.user_email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{t.ticker}</td>
                    <td className="p-3 font-mono">{t.quantity}</td>
                    <td className="p-3 font-mono text-gray-300">${parseFloat(t.execution_price || 0).toFixed(2)}</td>
                    <td className="p-3 font-mono font-semibold text-white">${(parseFloat(t.execution_price || 0) * parseFloat(t.quantity || 0)).toFixed(2)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Aucune transaction trouvée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
              <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
