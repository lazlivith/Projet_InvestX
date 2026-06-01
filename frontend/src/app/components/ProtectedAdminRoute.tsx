import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  onBack: () => void;
}

/**
 * Guard component — Protège le Dashboard Admin côté frontend.
 *
 * Règles :
 * - Autorise les rôles : admin, superadmin
 * - Refuse les clients même si localStorage a été manipulé
 * - Le backend double-check via requireAdmin middleware
 */
export function ProtectedAdminRoute({ children, onBack }: ProtectedAdminRouteProps) {
  const { isAdmin, isLoading } = useAuth();

  // Pendant le chargement (sync avec serveur en cours), ne rien afficher
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f0f23]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas admin/superadmin : écran d'accès refusé
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f0f23]">
        <div className="text-center max-w-md px-8">
          {/* Icône animée */}
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-red-500/10 border-2 border-red-500/50 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Titre */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Accès Refusé</h2>
          </div>

          {/* Message */}
          <p className="text-gray-400 mb-2 leading-relaxed">
            Vous n'avez pas les privilèges nécessaires pour accéder au
            <span className="text-red-400 font-semibold"> Panneau d'Administration</span>.
          </p>
          <p className="text-gray-600 text-sm mb-8">
            Cette zone est réservée aux Administrateurs et Super-Administrateurs InvestX.
          </p>

          {/* Bouton retour */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Accès autorisé
  return <>{children}</>;
}
