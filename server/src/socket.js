let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        io = new Server(httpServer, {
            cors: {
                origin: 'http://localhost:5173',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true,
            }
        });
        
        io.on('connection', (socket) => {
            console.log('Client connected to socket:', socket.id);
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
