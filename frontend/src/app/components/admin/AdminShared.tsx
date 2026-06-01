import React from 'react';
import { Crown, Shield, UserCheck, AlertCircle } from 'lucide-react';

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    superadmin: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
    admin: 'bg-red-500/20 text-red-400 border border-red-500/40',
    client: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  };
  const icons: Record<string, React.ReactNode> = {
    superadmin: <Crown className="size-3" />,
    admin: <Shield className="size-3" />,
    client: <UserCheck className="size-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.client}`}>
      {icons[role]} {role}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-[#0f0f23] rounded-xl border border-gray-800 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="size-6 text-orange-400 shrink-0" />
          <h3 className="text-white font-semibold">Confirmation requise</h3>
        </div>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
