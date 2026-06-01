import { useState } from 'react';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { AuthForm } from '@/app/components/AuthForm';
import { TradingViewWidget } from '@/app/components/TradingViewWidget';
import { Watchlist } from '@/app/components/Watchlist';
import { MarketOverview } from '@/app/components/MarketOverview';
import { OrderPanel } from '@/app/components/OrderPanel';
import { Portfolio } from '@/app/components/Portfolio';
import { AdminDashboard } from '@/app/components/admin/AdminDashboard';
import { ProtectedAdminRoute } from '@/app/components/ProtectedAdminRoute';
import ActivityPage from '@/app/components/ActivityPage';
import {
  Activity, TrendingUp, Wallet, BarChart3,
  Menu, LogOut, Shield, Crown
} from 'lucide-react';
import { Toaster } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard principal (utilisateurs authentifiés)
// ─────────────────────────────────────────────────────────────────────────────

function TradingDashboard() {
  const [activeTab, setActiveTab] = useState('trading');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTicker, setCurrentTicker] = useState('AAPL');
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();

  return (
    <div className="size-full flex flex-col bg-[#0f0f23] text-white">
      {/* ─── Barre de navigation ─── */}
      <nav className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-gray-800 shrink-0">
        {/* Logo + Toggle sidebar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-6 text-green-500" />
            <span className="text-xl font-bold">InvestX</span>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="flex items-center gap-1">
          {[
            { key: 'trading', label: 'Trading', Icon: BarChart3 },
            { key: 'portfolio', label: 'Portfolio', Icon: Wallet },
            { key: 'activity', label: 'Activité', Icon: Activity },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}

          {/* Bouton Admin — visible uniquement pour admin et superadmin */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                activeTab === 'admin'
                  ? 'bg-yellow-600 text-white'
                  : 'text-yellow-400 hover:bg-yellow-900/30 border border-yellow-700/40'
              }`}
            >
              {isSuperAdmin ? <Crown className="size-4" /> : <Shield className="size-4" />}
              <span>{isSuperAdmin ? 'SuperAdmin' : 'Admin'}</span>
            </button>
          )}
        </div>

        {/* Info utilisateur + Déconnexion */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-xs">
                <Crown className="size-3" /> SuperAdmin
              </span>
            )}
            {!isSuperAdmin && isAdmin && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs">
                <Shield className="size-3" /> Admin
              </span>
            )}
            <span className="text-sm text-gray-400">
              {user?.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-700 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors text-sm"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
        </div>
      </nav>

      {/* ─── Contenu principal ─── */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'admin' ? (
          // Guard de sécurité — empêche les non-admins même si l'onglet est forcé
          <ProtectedAdminRoute onBack={() => setActiveTab('trading')}>
            <AdminDashboard />
          </ProtectedAdminRoute>
        ) : (
          <>
            {/* Sidebar Watchlist */}
            {isSidebarOpen && (
              <aside className="w-80 bg-[#1a1a2e] border-r border-gray-800 flex flex-col shrink-0">
                <Watchlist onStockSelect={setCurrentTicker} />
              </aside>
            )}

            {/* Centre — Graphique */}
            <main className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4">
                <TradingViewWidget ticker={currentTicker} />
              </div>
              <div className="h-32 border-t border-gray-800 shrink-0">
                <MarketOverview />
              </div>
            </main>

            {/* Panneau droit */}
            <aside className="w-96 bg-[#1a1a2e] border-l border-gray-800 flex flex-col overflow-hidden shrink-0">
              {activeTab === 'trading' && <OrderPanel currentTicker={currentTicker} />}
              {activeTab === 'portfolio' && <Portfolio />}
              {activeTab === 'activity' && (
                <div className="flex-1 overflow-auto">
                  <ActivityPage />
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-[#0f0f23] text-white">
        <div className="text-center">
          <TrendingUp className="size-12 text-green-500 mx-auto mb-4 animate-pulse" />
          <div className="text-lg font-medium mb-2">InvestX</div>
          <div className="text-sm text-gray-500">Vérification de la session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <TradingDashboard />;
}
