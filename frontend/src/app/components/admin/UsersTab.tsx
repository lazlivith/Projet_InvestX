import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Search, History } from 'lucide-react';
import { RoleBadge, ConfirmModal } from './AdminShared';

interface UsersTabProps {
  onViewTransactions?: (userId: string) => void;
}

export function UsersTab({ onViewTransactions }: UsersTabProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ userId: string; role: string; name: string } | null>(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
    } catch {
      toast.error('Erreur lors de la récupération des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = (userId: string, newRole: string, userName: string) => {
    setConfirm({ userId, role: newRole, name: userName });
  };

  const confirmRoleChange = async () => {
    if (!confirm) return;
    try {
      await adminAPI.updateUser(confirm.userId, { role: confirm.role as any });
      toast.success(`Rôle de ${confirm.name} mis à jour → ${confirm.role}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur de mise à jour');
    } finally {
      setConfirm(null);
    }
  };

  const handleToggleActive = async (userId: string, current: boolean, name: string) => {
    try {
      await adminAPI.updateUser(userId, { is_active: !current });
      toast.success(`${name} ${!current ? 'activé' : 'désactivé'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {confirm && (
        <ConfirmModal
          message={`Changer le rôle de "${confirm.name}" en "${confirm.role}" ?`}
          onConfirm={confirmRoleChange}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-[#0f0f23] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors w-56"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="p-3 w-12"></th>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Solde</th>
              <th className="p-3">Statut</th>
              {isSuperAdmin && <th className="p-3">Changer Rôle</th>}
              <th className="p-3">Actif</th>
              <th className="p-3 text-center">Historique</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isSelf = String(u.id) === String(currentUser?.id);
              const isTargetSuperAdmin = u.role === 'superadmin';
              const canEdit = !isSelf && !isTargetSuperAdmin;
              return (
                <tr key={u.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${isSelf ? 'opacity-60' : ''}`}>
                  <td className="p-3">
                    <div className="size-8 rounded-full bg-slate-800 border border-gray-700 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.name?.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium text-white">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-gray-500">(vous)</span>}
                  </td>
                  <td className="p-3 text-gray-400">{u.email}</td>
                  <td className="p-3"><RoleBadge role={u.role} /></td>
                  <td className="p-3 font-mono text-green-400">${parseFloat(u.balance || 0).toLocaleString()}</td>
                  <td className="p-3">
                    {u.is_active !== false
                      ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="size-3" />Actif</span>
                      : <span className="flex items-center gap-1 text-gray-500 text-xs"><XCircle className="size-3" />Inactif</span>}
                  </td>
                  {isSuperAdmin && (
                    <td className="p-3">
                      {canEdit ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value, u.name)}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm outline-none hover:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="client">Client</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-3">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active !== false, u.name)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${u.is_active !== false
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                      >
                        {u.is_active !== false ? 'Désactiver' : 'Activer'}
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onViewTransactions?.(String(u.id))}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                      title="Voir les transactions"
                    >
                      <History className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Aucun utilisateur trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
