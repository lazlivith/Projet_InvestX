import React, { useState } from 'react';
import { analyticsAPI } from '../services/api';

interface SentimentAnalysisProps {
    ticker: string;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ ticker }) => {
    const [newsText, setNewsText] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const analyze = async () => {
        setLoading(true);
        try {
            const response = await analyticsAPI.sentiment({
                text: newsText,
                ticker
            });
            setResult(response.data.analysis || response.data);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="bg-[#0f0f23] p-4 rounded-lg border border-gray-800 mt-4">
            <h4 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-widest">IA Sentiment Engine</h4>
            <textarea
                className="w-full bg-[#1a1a2e] border border-gray-700 rounded p-3 text-sm text-gray-300 h-20 mb-2 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                placeholder="Collez une news ou un rapport financier ici..."
                value={newsText}
                onChange={(e) => setNewsText(e.target.value)}
            />
            <button onClick={analyze} disabled={loading || !newsText} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded transition-all">
                {loading ? "ANALYSE QUANTITATIVE EN COURS..." : "LANCER L'ANALYSE IA"}
            </button>

            {result && (
                <div className="mt-4 p-3 bg-black/40 rounded flex items-center justify-between border-l-4" style={{ borderColor: result.sentiment === 'BULLISH' ? '#10b981' : (result.sentiment === 'BEARISH' ? '#ef4444' : '#6b7280') }}>
                    <div>
                        <span className="text-[10px] text-gray-500 block uppercase">Signal détecté</span>
                        <span className={`font-black text-lg ${result.sentiment === 'BULLISH' ? 'text-green-400' : result.sentiment === 'BEARISH' ? 'text-red-400' : 'text-gray-400'}`}>
                            {result.sentiment}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-500 block uppercase">Confiance IA</span>
                        <div className="w-24 h-2 bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.abs(result.score) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SentimentAnalysis;
