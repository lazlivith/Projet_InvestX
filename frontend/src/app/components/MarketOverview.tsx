import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const initialIndices: MarketIndex[] = [
  { symbol: 'SPX', name: 'S&P 500', value: 4783.45, change: 23.45, changePercent: 0.49 },
  { symbol: 'DJI', name: 'Dow Jones', value: 37440.34, change: -45.23, changePercent: -0.12 },
  { symbol: 'IXIC', name: 'NASDAQ', value: 14765.29, change: 102.34, changePercent: 0.70 },
  { symbol: 'DAX', name: 'DAX 40', value: 16789.23, change: 15.67, changePercent: 0.09 },
  { symbol: 'FTSE', name: 'FTSE 100', value: 7512.45, change: -12.34, changePercent: -0.16 },
];

export function MarketOverview() {
  const [indices, setIndices] = useState<MarketIndex[]>(initialIndices);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndices(prevIndices =>
        prevIndices.map(index => {
          const randomChange = (Math.random() - 0.5) * 10;
          const newValue = index.value + randomChange;
          const newChange = index.change + randomChange;
          const newChangePercent = (newChange / (newValue - newChange)) * 100;

          return {
            ...index,
            value: parseFloat(newValue.toFixed(2)),
            change: parseFloat(newChange.toFixed(2)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-[#1a1a2e] p-4">
      <div className="flex items-center gap-6 h-full overflow-x-auto">
        {indices.map((index) => (
          <div
            key={index.symbol}
            className="flex items-center gap-4 px-4 py-2 bg-[#0f0f23] rounded-lg border border-gray-800 whitespace-nowrap"
          >
            <div>
              <div className="text-xs text-gray-400">{index.name}</div>
              <div className="font-semibold text-lg">{index.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div
              className={`flex items-center gap-1 ${
                index.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {index.change >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              <div className="text-sm">
                <div>
                  {index.change >= 0 ? '+' : ''}
                  {index.change.toFixed(2)}
                </div>
                <div className="text-xs">
                  ({index.change >= 0 ? '+' : ''}
                  {index.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
