import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register(formData);
        setIsLogin(true);
        setFormData({ name: '', email: '', password: '' });
        alert('Inscription réussie ! Veuillez vous connecter.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f23] p-4">
      <Card className="w-full max-w-md bg-[#1a1a2e] border-gray-800">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-8 text-green-500" />
            <span className="text-2xl font-bold text-white">InvestX</span>
          </div>
          <CardTitle className="text-2xl text-white">
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isLogin
              ? 'Connectez-vous pour continuer'
              : 'Créez un nouveau compte avec 100 000 USD de capital de départ'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nom</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  className="bg-[#0f0f23] border-gray-700 text-white"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@exemple.fr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-[#0f0f23] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-[#0f0f23] border-gray-700 text-white"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-900/20 border border-red-700 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {isLogin
                ? 'Pas encore de compte ? Inscrivez-vous maintenant'
                : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
