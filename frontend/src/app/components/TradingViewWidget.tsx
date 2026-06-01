import { useEffect, useRef, memo, useState } from 'react';

const intervals = [
  { label: '1M', value: '1' },
  { label: '5M', value: '5' },
  { label: '15M', value: '15' },
  { label: '30M', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
];

interface TradingViewWidgetProps {
  ticker?: string;
}

export const TradingViewWidget = memo(({ ticker = 'AAPL' }: TradingViewWidgetProps) => {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('D');

  useEffect(() => {
    if (!container.current) return;

    // Remove existing widget if it exists
    if (container.current.firstChild) {
      container.current.removeChild(container.current.firstChild);
    }

    // Create and configure the widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `NASDAQ:${ticker}`,
      interval: selectedInterval,
      timezone: 'Europe/Paris',
      theme: 'dark',
      style: '1',
      locale: 'fr',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'STD;SMA'
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      container_id: 'tradingview_widget'
    });

    scriptRef.current = script;
    
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'tradingview_widget';
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = 'calc(100% - 48px)';
    widgetContainer.style.width = '100%';

    container.current.appendChild(widgetContainer);
    widgetContainer.appendChild(script);

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [selectedInterval, ticker]);

  return (
    <div className="size-full bg-[#131722] rounded-lg overflow-hidden">
      {/* Interval Buttons */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-800">
        {intervals.map((interval) => (
          <button
            key={interval.value}
            onClick={() => setSelectedInterval(interval.value)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedInterval === interval.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {interval.label}
          </button>
        ))}
      </div>

      <div
        ref={container}
        className="tradingview-widget-container size-full"
      >
        <div className="flex items-center justify-center size-full text-gray-400">
          Chargement du graphique...
        </div>
      </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';