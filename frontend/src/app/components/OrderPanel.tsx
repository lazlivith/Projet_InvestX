import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { tradeAPI } from '../services/api';
import { socketService, PriceUpdate } from '../services/socket';
import { toast } from 'sonner';

type OrderType = 'BUY' | 'SELL';

interface OrderPanelProps {
  currentTicker?: string;
}

export function OrderPanel({ currentTicker = 'AAPL' }: OrderPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>('BUY');
  const [orderClass, setOrderClass] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState('100');
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    const fetchInitialQuote = async () => {
      try {
        const response = await tradeAPI.getQuote(currentTicker);
        if (response.data) {
          setCurrentPrice((prev) => prev || {
            ticker: currentTicker,
            bid: response.data.bid.toFixed(4),
            ask: response.data.ask.toFixed(4),
            last: response.data.last.toFixed(4),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error("Impossible de récupérer le prix initial", error);
      }
    };

    fetchInitialQuote();

    const handlePriceUpdate = (data: PriceUpdate) => {
      setCurrentPrice(data);
    };

    socketService.subscribe(currentTicker, handlePriceUpdate);

    return () => {
      socketService.unsubscribe(currentTicker, handlePriceUpdate);
    };
  }, [currentTicker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      if (orderClass === 'MARKET') {
        response = await tradeAPI.marketOrder({
          ticker: currentTicker,
          type: orderType,
          quantity: parseInt(quantity),
        });
      } else {
        response = await tradeAPI.limitOrder({
          ticker: currentTicker,
          type: orderType,
          quantity: parseInt(quantity),
          limitPrice: parseFloat(limitPrice),
        });
      }

      const { data, message } = response.data;

      toast.success(
        message || `${orderType === 'BUY' ? 'Achat' : 'Vente'} exécuté(e)`,
        {
          description: orderClass === 'MARKET' 
            ? `${data.quantity} ${data.ticker} @ $${data.executedPrice}`
            : `${data.quantity} ${data.ticker} Limite @ $${data.limitPrice}`,
        }
      );

      setQuantity('100');
      setLimitPrice('');
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Échec de l\'ordre';
      toast.error('Erreur', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executionPrice = orderClass === 'LIMIT' && limitPrice ? limitPrice : (orderType === 'BUY' ? currentPrice?.ask : currentPrice?.bid);
  const totalCost = (parseFloat(quantity || '0') * parseFloat(executionPrice || '0')).toFixed(2);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold mb-2">Panneau d'ordre</h2>
        <div className="text-sm text-gray-400">{currentTicker}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderType('BUY')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                orderType === 'BUY'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <ArrowUpCircle className="size-5" />
              Acheter
            </button>
            <button
              type="button"
              onClick={() => setOrderType('SELL')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                orderType === 'SELL'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <ArrowDownCircle className="size-5" />
              Vendre
            </button>
          </div>

          {/* Live Price Display */}
          {currentPrice && (
            <div className="p-3 bg-[#0f0f23] rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Prix en direct</div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400">Bid</div>
                  <div className="font-semibold text-red-400">${currentPrice.bid}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Last</div>
                  <div className="font-semibold">${currentPrice.last}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Ask</div>
                  <div className="font-semibold text-green-400">${currentPrice.ask}</div>
                </div>
              </div>
            </div>
          )}

          {/* Market / Limit Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setOrderClass('MARKET')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                orderClass === 'MARKET' ? 'bg-[#0f0f23] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Au Marché
            </button>
            <button
              type="button"
              onClick={() => setOrderClass('LIMIT')}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                orderClass === 'LIMIT' ? 'bg-[#0f0f23] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Limite
            </button>
          </div>

          {/* Info dynamique selon type d'ordre */}
          {orderClass === 'MARKET' ? (
            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="text-sm font-medium">Ordre au marché</div>
              <div className="text-xs text-gray-400 mt-1">
                Exécution immédiate au prix actuel du marché
              </div>
            </div>
          ) : (
            <div className="p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
              <div className="text-sm font-medium">Ordre limite</div>
              <div className="text-xs text-gray-400 mt-1">
                L'ordre sera exécuté automatiquement quand le prix atteindra votre cible.
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-400 mb-1">Prix Limite ($)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-3 py-2 bg-[#0f0f23] border border-purple-700/50 rounded focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Ex: 150.50"
                />
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Quantité</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              className="w-full px-4 py-3 bg-[#0f0f23] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="0"
            />
          </div>

          {/* Order Summary */}
          <div className="p-4 bg-[#0f0f23] rounded-lg border border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Quantité :</span>
              <span>{quantity} actions</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Prix d'exécution :</span>
              <span className={orderType === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                ${executionPrice || '0.00'}
              </span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-700">
              <span>Montant total :</span>
              <span>${totalCost}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !currentPrice}
            className={`w-full py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              orderType === 'BUY'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSubmitting
              ? 'Exécution en cours...'
              : orderType === 'BUY'
              ? 'Passer un ordre d\'achat'
              : 'Passer un ordre de vente'}
          </button>
        </form>
      </div>
    </div>
  );
}
