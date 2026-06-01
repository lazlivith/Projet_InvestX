# InvestX Trading Frontend

Ein professionelles Trading-Dashboard für Daytrading mit TradingView Chart-Widget, Echtzeit-Marktdaten und vollständiger Backend-Integration.

## 🚀 Features

- **Authentifizierung**: JWT-basiertes Login/Register-System mit 100.000 USD virtuellem Startkapital
- **Live-Marktdaten**: WebSocket-basierte Echtzeit-Kursaktualisierungen via Socket.io
- **Trading**: Market Order Execution (BUY/SELL) mit sofortiger Ausführung
- **Portfolio**: Echtzeit-Portfolio-Übersicht mit Positionen und P&L
- **TradingView Integration**: Professionelle Charts mit Multi-Timeframe-Unterstützung
- **Watchlist**: Live-Kursanzeigen für AAPL, MSFT, GOOGL, AMZN, TSLA

## 📋 Voraussetzungen

- Node.js (v18 oder höher)
- pnpm
- InvestX Backend (siehe Backend-Dokumentation)

## 🛠️ Installation

1. **Dependencies installieren**:
```bash
pnpm install
```

2. **Environment-Variablen konfigurieren**:
```bash
cp .env.example .env
```

Bearbeiten Sie die `.env` Datei und passen Sie die URLs an:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

3. **Backend starten** (in einem separaten Terminal):
Folgen Sie den Anweisungen in der Backend-Dokumentation, um den InvestX-Backend-Server zu starten.

4. **Frontend starten**:
Der Vite-Dev-Server läuft bereits automatisch im Hintergrund.

## 🔗 Backend-Integration

### API-Endpoints

Das Frontend nutzt folgende Backend-Endpoints:

- `POST /api/v1/auth/register` - Benutzer-Registrierung
- `POST /api/v1/auth/login` - Benutzer-Login
- `POST /api/v1/trade/market-order` - Market Order ausführen
- `GET /api/v1/portfolio` - Portfolio-Daten abrufen (Custom Endpoint)

### WebSocket-Events

Socket.io-Events für Live-Daten:

**Eingehend (Client → Server):**
- `subscribe` - Abonnieren eines Tickers
- `unsubscribe` - Deabonnieren eines Tickers

**Ausgehend (Server → Client):**
- `priceUpdate` - Live-Kursaktualisierungen
  ```json
  {
    "ticker": "AAPL",
    "bid": "150.2500",
    "ask": "150.4000",
    "last": "150.3250",
    "timestamp": 1779100748
  }
  ```

## 📁 Projektstruktur

```
src/
├── app/
│   ├── components/
│   │   ├── ui/              # Shadcn UI-Komponenten
│   │   ├── AuthForm.tsx     # Login/Register-Formular
│   │   ├── OrderPanel.tsx   # Trading-Panel
│   │   ├── Portfolio.tsx    # Portfolio-Übersicht
│   │   ├── Watchlist.tsx    # Echtzeit-Watchlist
│   │   ├── TradingViewWidget.tsx
│   │   └── MarketOverview.tsx
│   ├── context/
│   │   └── AuthContext.tsx  # Auth State Management
│   ├── hooks/
│   │   └── usePortfolio.ts  # Portfolio Data Hook
│   ├── services/
│   │   ├── api.ts          # Axios API Service
│   │   └── socket.ts       # Socket.io Service
│   └── App.tsx             # Haupt-App-Komponente
└── styles/
    └── theme.css           # Theme-Konfiguration
```

## 🔐 Authentifizierung

Das Frontend verwendet JWT-Token für die Authentifizierung:

- **Access Token**: 15 Minuten Gültigkeit
- **Refresh Token**: 7 Tage Gültigkeit

Token werden im LocalStorage gespeichert und automatisch bei jedem API-Request mitgesendet.

## 📊 Komponenten-Übersicht

### AuthForm
Kombiniertes Login/Register-Formular mit Validierung und Fehlerbehandlung.

### OrderPanel
- Live-Preis-Anzeige (Bid/Ask/Last)
- Market Order Execution
- Quantity Input
- Order-Zusammenfassung

### Watchlist
- Live-Kurse für mehrere Aktien
- Socket.io-basierte Updates
- Favorite-Funktion
- Click-to-select für Trading

### Portfolio
- Echtzeit-Portfolio-Wert
- Positionen mit P&L
- Verfügbares Kapital
- Auto-Refresh alle 10 Sekunden

## 🎨 Design-System

Das Projekt verwendet:
- **Tailwind CSS v4** für Styling
- **Radix UI** für accessible Komponenten
- **Lucide React** für Icons
- **Sonner** für Toast-Notifications

## 🔧 Entwicklung

### API-Service erweitern

Neue Endpoints in `src/app/services/api.ts` hinzufügen:

```typescript
export const myAPI = {
  getData: () => api.get('/my-endpoint'),
};
```

### Socket-Events erweitern

Socket-Service in `src/app/services/socket.ts` anpassen:

```typescript
this.socket.on('myEvent', (data) => {
  // Handle event
});
```

## 🐛 Debugging

### Backend nicht erreichbar
1. Überprüfen Sie, ob das Backend läuft: `http://localhost:3000/health`
2. Prüfen Sie die Environment-Variablen in `.env`
3. Überprüfen Sie CORS-Einstellungen im Backend

### WebSocket-Verbindung fehlgeschlagen
1. Überprüfen Sie die Socket.io-URL in `.env`
2. Prüfen Sie Browser-Console auf Fehler
3. Stellen Sie sicher, dass der Backend-WebSocket-Server läuft

## 📝 Notizen

- Das Backend muss vor dem Frontend gestartet werden
- Standardmäßig verbindet sich das Frontend mit `localhost:3000`
- Für Production müssen die URLs in `.env` angepasst werden
- TradingView-Widget benötigt keine API-Keys (verwendet öffentliche Daten)

## 🚀 Deployment

Für Production-Deployment:

1. Backend-URL in `.env.production` setzen
2. Build erstellen (Hinweis: `vite build` ist in dieser Umgebung deaktiviert)
3. Environment-Variablen auf dem Server konfigurieren

## 📞 Support

Bei Fragen oder Problemen:
- Backend-Dokumentation: `investx-backend-doc.md`
- API-Referenz: Siehe Backend `/api/v1` Endpoints
