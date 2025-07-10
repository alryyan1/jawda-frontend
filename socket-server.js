import { Server } from 'socket.io';
import http from 'http';
import { host } from './src/pages/constants';

// Create HTTP server
const server = http.createServer();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5174", "http://127.0.0.1:5174", "http://192.168.100.12:5174","*"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Handle connections
io.on('connection', (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);
  
  // Handle room joining
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`📥 Client ${socket.id} joined room: ${room}`);
    socket.emit('room-joined', { room, message: `Successfully joined ${room}` });
  });
  
  // Handle room leaving
  socket.on('leave', (room) => {
    socket.leave(room);
    console.log(`📤 Client ${socket.id} left room: ${room}`);
    socket.emit('room-left', { room, message: `Successfully left ${room}` });
  });
  
  // Handle test connection
  socket.on('test-connection', () => {
    console.log(`🧪 Test connection from: ${socket.id}`);
    socket.emit('test-response', { message: 'Connection test successful!' });
  });
  
  // Example: Simulate lab payment updates
  socket.on('simulate-lab-update', (data) => {
    console.log(`🧪 Simulating lab update for visit: ${data.visitId}`);
    // Broadcast to all clients in the lab-updates room
    io.to('lab-updates').emit('lab.payment.updated', {
      visitId: data.visitId,
      allRequestsPaid: true,
      isLastResultPending: false,
      isReadyForPrint: true
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Start server
const PORT = 8000;
server.listen(PORT, host, () => {
  console.log(`🚀 Socket.IO server running on http://${host}:${PORT}`);
  console.log(`📡 Waiting for connections...`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 