import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { socketService, PriceUpdate } from '../services/socket';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  isFavorite: boolean;
}

const stockInfo = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

interface WatchlistProps {
  onStockSelect?: (symbol: string) => void;
}

export function Watchlist({ onStockSelect }: WatchlistProps) {
  const [stocks, setStocks] = useState<Stock[]>(
    stockInfo.map((info) => ({
      ...info,
      price: 0,
      bid: 0,
      ask: 0,
      change: 0,
      changePercent: 0,
      isFavorite: true,
    }))
  );
  const [search, setSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');
  // Utilisation d'une Ref pour stocker les prix de référence sans déclencher de cycle de re-souscription
  const sessionStartPrices = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    socketService.connect();

    const handler = (data: PriceUpdate) => {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.symbol === data.ticker) {
            const currentPrice = parseFloat(data.last);

            // Capture du prix d'ouverture de session pour le calcul du % de variation
            if (!sessionStartPrices.current.has(data.ticker)) {
              sessionStartPrices.current.set(data.ticker, currentPrice);
            }

            const initialPrice = sessionStartPrices.current.get(data.ticker) || currentPrice;
            const change = currentPrice - initialPrice;
            const changePercent = initialPrice !== 0 ? (change / initialPrice) * 100 : 0;

            return {
              ...stock,
              price: currentPrice,
              bid: parseFloat(data.bid),
              ask: parseFloat(data.ask),
              change: parseFloat(change.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
            };
          }
          return stock;
        })
      );
    };

    stockInfo.forEach((info) => {
      socketService.subscribe(info.symbol, handler);
    });

    return () => {
      stockInfo.forEach((info) => {
        socketService.unsubscribe(info.symbol, handler);
      });
    };
  }, []); // Dépendances vides pour maintenir une connexion stable

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [stocks, search]);

  const toggleFavorite = (symbol: string) => {
    setStocks((prevStocks) =>
      prevStocks.map((stock) =>
        stock.symbol === symbol ? { ...stock, isFavorite: !stock.isFavorite } : stock
      )
    );
  };

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol);
    if (onStockSelect) {
      onStockSelect(symbol);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold mb-3">Liste de suivi</h2>
        <input
          type="text"
          placeholder="Rechercher un symbole..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-[#0f0f23] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredStocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => handleStockClick(stock.symbol)}
            className={`p-3 border-b border-gray-800 cursor-pointer transition-colors hover:bg-[#0f0f23] ${selectedStock === stock.symbol ? 'bg-[#0f0f23] border-l-4 border-l-blue-500' : ''
              }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(stock.symbol);
                    }}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Star
                      className={`size-3 ${stock.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-500'
                        }`}
                    />
                  </button>
                  <span className="font-semibold">{stock.symbol}</span>
                </div>
                <div className="text-xs text-gray-400 truncate mt-1">{stock.name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {stock.price > 0 ? `$${stock.price.toFixed(2)}` : 'Chargement...'}
                </div>
                <div
                  className={`text-xs flex items-center gap-1 ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                >
                  {stock.change >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  <span>
                    {stock.change >= 0 ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            {stock.bid > 0 && stock.ask > 0 && (
              <div className="flex gap-2 text-xs text-gray-500 mt-1">
                <span>Bid: ${stock.bid.toFixed(2)}</span>
                <span>Ask: ${stock.ask.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
