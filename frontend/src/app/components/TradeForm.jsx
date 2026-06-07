import React, { useState } from 'react';
import api from '../../services/api';

const TradeForm = ({ ticker, onOrderSuccess }) => {
    const [orderType, setOrderType] = useState('market');
    const [side, setSide] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const orderDetails = {
            ticker: ticker.toUpperCase(),
            side: side.toLowerCase(),
            quantity: parseFloat(quantity),
        };

        let endpoint = orderType === 'market' ? 'market-order' : 'limit-order';
        orderDetails.type = orderType;

        if (orderType === 'limit') {
            orderDetails.targetPrice = parseFloat(targetPrice);
            if (isNaN(orderDetails.targetPrice) || orderDetails.targetPrice <= 0) {
                setError("Le prix cible doit être un nombre positif.");
                setLoading(false);
                return;
            }
        }

        if (isNaN(orderDetails.quantity) || orderDetails.quantity <= 0) {
            setError("La quantité doit être un nombre positif.");
            setLoading(false);
            return;
        }

        try {
            const response = await api.post(`/trade/${endpoint}`, orderDetails);
            const data = response.data;

            setSuccessMessage(data.message || "Ordre passé avec succès !");
            setQuantity('');
            setTargetPrice('');
            if (onOrderSuccess) onOrderSuccess();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h3 className="text-xl font-semibold text-slate-800">Passer un Ordre pour {ticker}</h3>
            <div className="flex gap-4">
                <label className="flex items-center"><input type="radio" value="market" checked={orderType === 'market'} onChange={() => setOrderType('market')} className="mr-2" /> Ordre au Marché</label>
                <label className="flex items-center"><input type="radio" value="limit" checked={orderType === 'limit'} onChange={() => setOrderType('limit')} className="mr-2" /> Ordre Limite</label>
            </div>
            <div className="flex gap-4">
                <label className="flex items-center"><input type="radio" value="buy" checked={side === 'buy'} onChange={() => setSide('buy')} className="mr-2" /> Acheter</label>
                <label className="flex items-center"><input type="radio" value="sell" checked={side === 'sell'} onChange={() => setSide('sell')} className="mr-2" /> Vendre</label>
            </div>
            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantité</label>
                <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.0001" step="0.0001" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
            </div>
            {orderType === 'limit' && (
                <div>
                    <label htmlFor="targetPrice" className="block text-sm font-medium text-slate-700">Prix Cible</label>
                    <input type="number" id="targetPrice" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} min="0.01" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
                </div>
            )}
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            {successMessage && <p className="text-emerald-500 text-sm">{successMessage}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Traitement...' : `Passer l'ordre ${side.toUpperCase()}`}
            </button>
        </form>
    );
};

export default TradeForm;