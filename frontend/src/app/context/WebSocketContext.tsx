import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
    socket: Socket | null;
    subscribeToTickers: (tickers: string[]) => void;
    unsubscribeFromTickers: (tickers: string[]) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const activeSubscriptions = useRef(new Set<string>());

    useEffect(() => {
        const API_PORT = import.meta.env.VITE_API_PORT || '5000';
        const API_URL = import.meta.env.VITE_API_URL || `http://localhost:${API_PORT}`;

        const newSocket = io(API_URL, {
            transports: ['websocket'],
            upgrade: false
        });

        newSocket.on('connect', () => {
            console.log('🌐 Connecté au serveur de flux d’InvestX');
            // Réabonner automatiquement aux tickers actifs en cas de reconnexion
            activeSubscriptions.current.forEach(ticker => {
                newSocket.emit('subscribe', ticker);
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const subscribeToTickers = (tickers: string[]) => {
        if (!socket) return;
        tickers.forEach(ticker => {
            if (!activeSubscriptions.current.has(ticker)) {
                activeSubscriptions.current.add(ticker);
                socket.emit('subscribe', ticker);
            }
        });
    };

    const unsubscribeFromTickers = (tickers: string[]) => {
        if (!socket) return;
        tickers.forEach(ticker => {
            if (activeSubscriptions.current.has(ticker)) {
                activeSubscriptions.current.delete(ticker);
                socket.emit('unsubscribe', ticker);
            }
        });
    };

    return (
        <WebSocketContext.Provider value={{ socket, subscribeToTickers, unsubscribeFromTickers }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
    return context;
};