import { useState, useEffect } from 'react';
import api from '../services/api';

export interface Position {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface PortfolioData {
  positions: Position[];
  cashAvailable: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
}

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    positions: [],
    cashAvailable: 100000,
    totalValue: 100000,
    totalProfitLoss: 0,
    totalProfitLossPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/portfolio');
      const data = response.data;

      // Map backend response to frontend PortfolioData structure
      const mappedPositions: Position[] = (data.positions || []).map((p: any) => ({
        symbol: p.ticker || p.symbol,
        name: p.ticker || p.symbol,
        quantity: parseFloat(p.quantity) || 0,
        avgPrice: parseFloat(p.average_purchase_price) || parseFloat(p.avgPrice) || 0,
        currentPrice: parseFloat(p.current_price) || parseFloat(p.currentPrice) || 0,
        totalValue: parseFloat(p.market_value) || parseFloat(p.totalValue) || 0,
        profitLoss: parseFloat(p.profit_loss) || parseFloat(p.profitLoss) || 0,
        profitLossPercent: parseFloat(p.profit_loss_percentage) || parseFloat(p.profitLossPercent) || 0,
      }));

      const cashAvailable = parseFloat(data.cashAvailable) || 0;
      const totalValue = parseFloat(data.totalEquity) || parseFloat(data.totalValue) || cashAvailable;
      const totalProfitLoss = parseFloat(data.totalProfitLoss) || 0;
      const totalProfitLossPercent = totalValue > 0 ? (totalProfitLoss / totalValue) * 100 : 0;

      setPortfolio({
        positions: mappedPositions,
        cashAvailable,
        totalValue,
        totalProfitLoss,
        totalProfitLossPercent,
      });
    } catch (err: any) {
      console.error('Portfolio fetch error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Erreur lors du chargement du portefeuille');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();

    const interval = setInterval(() => {
      fetchPortfolio();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return { portfolio, isLoading, error, refetch: fetchPortfolio };
};
