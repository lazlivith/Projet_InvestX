# Backend-Integration Guide

## Erforderliche Backend-Änderungen

Das Frontend erwartet einen zusätzlichen Endpoint, der in der aktuellen Backend-Dokumentation nicht erwähnt wurde:

### Portfolio Endpoint (Empfohlen)

**Endpoint**: `GET /api/v1/portfolio`

**Authentifizierung**: JWT Token erforderlich

**Beschreibung**: Gibt das vollständige Portfolio des authentifizierten Benutzers zurück, einschließlich aller Positionen, verfügbarem Kapital und Gewinn/Verlust-Berechnungen.

**Response-Format**:
```json
{
  "positions": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "quantity": 50,
      "avgPrice": 165.30,
      "currentPrice": 178.45,
      "totalValue": 8922.50,
      "profitLoss": 657.50,
      "profitLossPercent": 7.95
    }
  ],
  "cashAvailable": 85000.00,
  "totalValue": 100000.00,
  "totalProfitLoss": 5000.00,
  "totalProfitLossPercent": 5.26
}
```

### Implementierungs-Beispiel (Node.js/Express)

```javascript
// routes/portfolioRoutes.js
router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Hole Wallet-Daten
    const wallet = await db('wallets')
      .where('user_id', userId)
      .first();
    
    // 2. Hole alle Positionen
    const positions = await db('positions')
      .where('user_id', userId)
      .where('quantity', '>', 0);
    
    // 3. Hole aktuelle Preise aus Redis/Cache
    const positionsWithCurrentPrices = await Promise.all(
      positions.map(async (position) => {
        const quote = await redisClient.get(`quote:${position.ticker}`);
        const currentPrice = quote ? parseFloat(JSON.parse(quote).last) : 0;
        
        const totalValue = position.quantity * currentPrice;
        const totalCost = position.quantity * position.average_purchase_price;
        const profitLoss = totalValue - totalCost;
        const profitLossPercent = (profitLoss / totalCost) * 100;
        
        return {
          symbol: position.ticker,
          name: position.ticker, // Oder aus einer Stocks-Tabelle
          quantity: position.quantity,
          avgPrice: parseFloat(position.average_purchase_price),
          currentPrice: currentPrice,
          totalValue: parseFloat(totalValue.toFixed(2)),
          profitLoss: parseFloat(profitLoss.toFixed(2)),
          profitLossPercent: parseFloat(profitLossPercent.toFixed(2))
        };
      })
    );
    
    // 4. Berechne Portfolio-Summen
    const totalPositionsValue = positionsWithCurrentPrices.reduce(
      (sum, pos) => sum + pos.totalValue,
      0
    );
    const totalValue = totalPositionsValue + wallet.cash_available;
    const totalProfitLoss = positionsWithCurrentPrices.reduce(
      (sum, pos) => sum + pos.profitLoss,
      0
    );
    const totalProfitLossPercent = 
      ((totalValue - 100000) / 100000) * 100; // Basierend auf 100k Startkapital
    
    res.json({
      positions: positionsWithCurrentPrices,
      cashAvailable: parseFloat(wallet.cash_available),
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
      totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2))
    });
    
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Laden des Portfolios',
      error: error.message 
    });
  }
});
```

## Alternative: Frontend-Mock-Daten

Falls der Portfolio-Endpoint nicht sofort implementiert werden kann, verwendet das Frontend automatisch einen Fallback mit Mock-Daten. Der Hook `usePortfolio` zeigt dann einen Fehler an, wenn die API nicht antwortet.

## WebSocket-Integration

Stellen Sie sicher, dass der Socket.io-Server auf dem Backend läuft und die folgenden Events unterstützt:

### Server-Setup (bereits implementiert)

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (ticker) => {
    socket.join(ticker);
    console.log(`Client ${socket.id} subscribed to ${ticker}`);
  });
  
  socket.on('unsubscribe', (ticker) => {
    socket.leave(ticker);
    console.log(`Client ${socket.id} unsubscribed from ${ticker}`);
  });
});

// Im Finnhub Worker
function broadcastPriceUpdate(ticker, quote) {
  io.to(ticker).emit('priceUpdate', {
    ticker,
    bid: quote.bid,
    ask: quote.ask,
    last: quote.last,
    timestamp: Date.now()
  });
}
```

## CORS-Konfiguration

Stellen Sie sicher, dass das Backend CORS für das Frontend erlaubt:

```javascript
// In server.js / app.js
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

## Environment-Variablen (Backend)

```env
# Backend .env
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/investx
FINNHUB_API_KEY=your-finnhub-key
```

## Testing

### Test-Benutzer erstellen

```bash
# Via cURL
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test-Order ausführen

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# 2. Market Order
curl -X POST http://localhost:3000/api/v1/trade/market-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ticker": "AAPL",
    "type": "BUY",
    "quantity": 10
  }'
```

## Troubleshooting

### WebSocket verbindet nicht

1. Überprüfen Sie Socket.io-Version (sollte kompatibel sein: Backend 4.x, Frontend 4.x)
2. Prüfen Sie CORS-Einstellungen
3. Testen Sie mit Socket.io-Admin UI

### JWT-Token wird nicht akzeptiert

1. Überprüfen Sie, ob `JWT_SECRET` auf Backend und Frontend übereinstimmt
2. Prüfen Sie Token-Format im Authorization Header
3. Validieren Sie Token-Ablaufzeit

### Portfolio lädt nicht

1. Implementieren Sie den `/api/v1/portfolio` Endpoint
2. Überprüfen Sie Datenbank-Abfragen
3. Testen Sie den Endpoint mit cURL/Postman
