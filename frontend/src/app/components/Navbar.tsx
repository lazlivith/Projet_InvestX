import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/context/AuthContext';
import {
    TrendingUp,
    LayoutDashboard,
    Activity,
    Crown,
    LogOut,
    LineChart,
    User,
    ChevronDown,
    Settings
} from 'lucide-react';

export function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    // Fermer le menu lors d'un clic à l'extérieur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. Redirection automatique dès la connexion
    useEffect(() => {
        if (isAuthenticated && user) {
            // Si l'admin est sur la racine ou une page client, on le renvoie vers son espace
            if (isAdmin && (location.pathname === '/' || location.pathname === '/dashboard')) {
                navigate('/admin');
            }
        }
    }, [isAuthenticated, isAdmin, navigate, location.pathname, user]);

    return (
        <nav className="h-16 border-b border-gray-800 bg-[#0a0a1b] flex items-center justify-between px-6 sticky top-0 z-40">
            <div className="flex items-center gap-8">
                {/* Logo dynamique */}
                <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
                    <LineChart className="size-6 text-blue-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        InvestX
                    </span>
                </Link>

                {/* Liens de navigation filtrés par rôle */}
                <div className="hidden md:flex items-center gap-1">
                    {/* Trading - Toujours visible pour tous */}
                    <Link
                        to="/trading"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/trading' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        <TrendingUp className="size-4" /> Trading
                    </Link>

                    {/* Portfolio - Uniquement pour les Clients */}
                    {!isAdmin && (
                        <Link
                            to="/portfolio"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/portfolio' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                            <LayoutDashboard className="size-4" /> Portfolio
                        </Link>
                    )}

                    {/* Activité - Uniquement pour les Clients (L'admin utilise l'Audit Global dans son panneau) */}
                    {!isAdmin && (
                        <Link
                            to="/activity"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/activity' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                            <Activity className="size-4" /> Activité
                        </Link>
                    )}

                    {/* Panneau d'Administration - Uniquement pour Admin / SuperAdmin */}
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/admin' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                            <Crown className="size-4" /> Panneau d'Administration
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 relative" ref={menuRef}>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">Connecté en tant que</p>
                    <p className="text-sm font-medium text-gray-200">{user?.name || user?.email}</p>
                </div>

                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
                >
                    <div className="size-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-700 shadow-lg">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Profile" className="size-full object-cover" />
                        ) : (
                            <span>{user?.name?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase() || <User className="size-4" />}</span>
                        )}
                    </div>
                    <ChevronDown className={`size-4 text-gray-500 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Menu Déroulant (Dropdown) */}
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#111122] border border-gray-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-2 border-b border-gray-800 mb-1">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'Utilisateur'}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>

                        <Link
                            to="/profile"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors"
                        >
                            <User className="size-4" />
                            Mon Profil
                        </Link>

                        <Link
                            to="/settings"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors"
                        >
                            <Settings className="size-4" />
                            Paramètres
                        </Link>

                        <div className="h-px bg-gray-800 my-1 mx-2"></div>

                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                            <LogOut className="size-4" />
                            Déconnexion
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}