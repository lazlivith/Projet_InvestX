import { useState, useEffect } from 'react';
import {
  Users, Bell, History, TrendingUp, Shield, BarChart3, Crown, UserCheck
} from 'lucide-react';
import { adminAPI } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { StatCard } from './AdminShared';
import { UsersTab } from './UsersTab';
import { AlertsTab } from './AlertsTab';
import { TransactionsTab } from './TransactionsTab';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'alerts' | 'transactions'>('users');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    adminAPI.getStats().then(r => setStats(r.data)).catch(() => { });
  }, []);

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <Crown className="size-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Panneau d'Administration</h1>
        </div>
        <p className="text-gray-400 text-sm ml-12">
          Connecté en tant que <span className="text-white font-medium">{user?.email}</span>
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Utilisateurs" value={stats.totalUsers} icon={Users} color="bg-blue-600" />
          <StatCard label="Admins" value={stats.totalAdmins} icon={Shield} color="bg-red-600" />
          <StatCard label="Clients" value={stats.totalClients} icon={UserCheck} color="bg-green-600" />
          <StatCard label="Transactions" value={stats.totalTransactions} icon={BarChart3} color="bg-purple-600" />
          <StatCard label="Volume ($)" value={`$${(stats.globalVolume || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="bg-orange-600" />
          <StatCard label="Alertes actives" value={stats.activeAlerts} icon={Bell} color="bg-yellow-600" />
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        {([
          { key: 'users', label: 'Utilisateurs', Icon: Users },
          { key: 'alerts', label: 'Modération Alertes', Icon: Bell },
          { key: 'transactions', label: 'Audit Global', Icon: History },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === key
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
      </div>
    </div>
  );
}
