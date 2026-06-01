import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';

export function Portfolio() {
  const { portfolio, isLoading, error, refetch } = usePortfolio();
  const { positions, cashAvailable, totalValue, totalProfitLoss, totalProfitLossPercent } = portfolio;

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <RefreshCw className="size-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Portefeuille</h2>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Portfolio Summary */}
        <div className="space-y-3">
          <div className="p-4 bg-[#0f0f23] rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Valeur totale</div>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </div>

          <div className="p-4 bg-[#0f0f23] rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">P&L Total</div>
            <div className="flex items-center gap-2">
              <div
                className={`text-xl font-bold ${
                  totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {totalProfitLoss >= 0 ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <TrendingDown className="size-4" />
                )}
                <span>
                  {totalProfitLoss >= 0 ? '+' : ''}
                  {totalProfitLossPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0f0f23] rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Capital disponible</div>
            <div className="text-xl font-bold">${cashAvailable.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold mb-3">Positions</h3>
        {isLoading && positions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Chargement du portefeuille...</div>
        ) : positions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Aucune position en cours</div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => (
            <div
              key={position.symbol}
              className="p-4 bg-[#0f0f23] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{position.symbol}</div>
                  <div className="text-xs text-gray-400">{position.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${position.currentPrice.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{position.quantity} actions</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Prix d'achat moy.</div>
                  <div className="font-medium">${position.avgPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Valeur totale</div>
                  <div className="font-medium">${position.totalValue.toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Gain/Perte</span>
                  <div
                    className={`flex items-center gap-1 font-semibold ${
                      position.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {position.profitLoss >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    <span>
                      {position.profitLoss >= 0 ? '+' : ''}${position.profitLoss.toFixed(2)}
                    </span>
                    <span className="text-xs">
                      ({position.profitLoss >= 0 ? '+' : ''}
                      {position.profitLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
