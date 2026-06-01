const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173", // En production, restreins l'accès à l'URL de ton application React (Vite)
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Nouveau client React connecté au flux Live : ${socket.id}`);

        // Permet au client de s'abonner à un Ticker spécifique (ex: AAPL) pour économiser la bande passante
        socket.on('subscribe', (ticker) => {
            socket.join(ticker.toUpperCase());
            console.log(`📈 Client ${socket.id} abonné aux flux de : ${ticker.toUpperCase()}`);
        });

        // Permet au client de se désabonner
        socket.on('unsubscribe', (ticker) => {
            socket.leave(ticker.toUpperCase());
            console.log(`📉 Client ${socket.id} désabonné de : ${ticker.toUpperCase()}`);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client déconnecté : ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io n'est pas initialisé !");
    }
    return io;
};

module.exports = { initSocket, getIO };
