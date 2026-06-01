import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Intercepteur REQUEST — Injecte le token JWT dans chaque requête
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// Intercepteur RESPONSE — Gestion des 401 (refresh) et 403 (accès refusé)
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Tentative de rafraîchissement du token si 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Le refresh a échoué → déconnexion complète
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.reload();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MarketOrderPayload {
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
}

export interface SentimentPayload {
  text: string;
  ticker: string;
}

export interface UpdateUserPayload {
  role?: 'client' | 'admin';
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// APIs groupées par domaine
// ─────────────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: RegisterPayload) => api.post('/auth/register', data),
  login: (data: LoginPayload) => api.post('/auth/login', data),
};

export const profileAPI = {
  /** Synchronise le profil et le rôle depuis la DB (anti-manipulation localStorage) */
  getMe: () => api.get('/users/me'),
};

export const tradeAPI = {
  marketOrder: (data: MarketOrderPayload) => api.post('/trade/market-order', data),
  limitOrder: (data: any) => api.post('/trade/limit-order', data),
  cancelOrder: (orderId: string) => api.post('/trade/cancel-order', { orderId }),
  getQuote: (ticker: string) => api.get(`/trade/quote/${ticker}`),
};

export const analyticsAPI = {
  sentiment: (data: SentimentPayload) => api.post('/analytics/sentiment', data),
};

export const portfolioAPI = {
  getDashboard: () => api.get('/portfolio'),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id: number | string, data: UpdateUserPayload) =>
    api.put(`/admin/users/${id}`, data),
  getAlerts: () => api.get('/admin/alerts'),
  deleteAlert: (id: number | string) => api.delete(`/admin/alerts/${id}`),
  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/admin/transactions', { params }),
};

export default api;
