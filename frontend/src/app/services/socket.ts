import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export interface PriceUpdate {
  ticker: string;
  bid: string;
  ask: string;
  last: string;
  timestamp: number;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: PriceUpdate) => void>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('priceUpdate', (data: PriceUpdate) => {
      const tickerListeners = this.listeners.get(data.ticker);
      if (tickerListeners) {
        tickerListeners.forEach((callback) => callback(data));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(ticker: string, callback: (data: PriceUpdate) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (!this.listeners.has(ticker)) {
      this.listeners.set(ticker, new Set());
      this.socket?.emit('subscribe', ticker);
    }

    this.listeners.get(ticker)?.add(callback);
  }

  unsubscribe(ticker: string, callback?: (data: PriceUpdate) => void) {
    const tickerListeners = this.listeners.get(ticker);

    if (!tickerListeners) return;

    if (callback) {
      tickerListeners.delete(callback);

      if (tickerListeners.size === 0) {
        this.listeners.delete(ticker);
        this.socket?.emit('unsubscribe', ticker);
      }
    } else {
      tickerListeners.clear();
      this.listeners.delete(ticker);
      this.socket?.emit('unsubscribe', ticker);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
