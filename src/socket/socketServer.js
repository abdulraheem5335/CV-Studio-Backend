/**
 * Socket.io Server for Real-Time Proximity Chat & Football Ground
 * 
 * Features:
 * - Player position tracking
 * - Proximity-based message delivery
 * - Multiplayer football ground with ball physics
 * - Throttled updates for performance
 */

const { Server } = require('socket.io');

// Configuration
const CONFIG = {
  PROXIMITY_THRESHOLD: 200,           // Distance in map units
  PROXIMITY_THRESHOLD_SQ: 200 * 200,  // Squared for performance
  POSITION_UPDATE_THROTTLE: 50,       // ms between position updates
  MESSAGE_RATE_LIMIT: 5,              // messages per second
  MESSAGE_MAX_LENGTH: 200,            // characters
  BUBBLE_DURATION: 5000,              // ms to show chat bubble
};

// Football ground configuration
const FOOTBALL_CONFIG = {
  FIELD: {
    width: 800,
    height: 600,
    padding: 50,
    goalWidth: 80,
    goalDepth: 25,
  },
  BALL_FRICTION: 0.985,          // Realistic grass friction
  BALL_MAX_SPEED: 20,
  BALL_BOUNCE: 0.7,              // Wall bounce coefficient
  POSITION_UPDATE_THROTTLE: 33,  // ~30 FPS
  BALL_SYNC_RATE: 33,            // Sync ball state to clients
  KICK_COOLDOWN: 300,            // ms between kicks
};

// In-memory player store
const players = new Map();

// Football ground state
const footballGround = {
  players: new Map(), // socketId -> player data
  ball: {
    x: FOOTBALL_CONFIG.FIELD.width / 2,
    y: FOOTBALL_CONFIG.FIELD.height / 2,
    vx: 0,
    vy: 0,
    spin: 0,
    lastKickedBy: null,
    lastKickTime: 0,
  },
  score: { red: 0, blue: 0 },
  isPlaying: true,
  lastBallSync: 0,
  matchStartTime: null,
};

// Rate limiting tracker
const messageRateLimits = new Map();

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 */
function initializeSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);

    // Handle player joining the game
    socket.on('player:join', (data) => {
      const { userId, nickname, avatar, x, y } = data;
      
      // Remove any existing player with same userId OR same nickname (handles reconnection/refresh/multiple tabs)
      players.forEach((existingPlayer, existingSocketId) => {
        if (existingSocketId !== socket.id && 
            (existingPlayer.userId === userId || existingPlayer.nickname === nickname)) {
          console.log(`[Socket] Removing duplicate player: ${existingPlayer.nickname} (${existingSocketId})`);
          io.emit('player:left', { socketId: existingSocketId });
          players.delete(existingSocketId);
          // Force disconnect the old socket
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) oldSocket.disconnect(true);
        }
      });
      
      players.set(socket.id, {
        userId: userId,
        nickname: nickname || 'Anonymous',
        avatar: avatar || { color: '#3B82F6' },
        x: x || 0,
        y: y || 0,
        lastUpdate: Date.now(),
        socketId: socket.id,
      });

      // Notify others of new player
      socket.broadcast.emit('player:joined', {
        socketId: socket.id,
        ...players.get(socket.id),
      });

      // Send current players to the new player (excluding self)
      const otherPlayers = [];
      players.forEach((player, id) => {
        if (id !== socket.id) {
          otherPlayers.push({ socketId: id, ...player });
        }
      });
      socket.emit('players:list', otherPlayers);

      console.log(`[Socket] Player joined: ${nickname} (${socket.id}), total players: ${players.size}`);
    });

    // Handle position updates (throttled on client)
    socket.on('player:position', (data) => {
      const player = players.get(socket.id);
      if (!player) return;

      const now = Date.now();
      if (now - player.lastUpdate < CONFIG.POSITION_UPDATE_THROTTLE) return;

      player.x = data.x;
      player.y = data.y;
      player.lastUpdate = now;

      // Broadcast position to ALL other players (so everyone can see each other)
      socket.broadcast.emit('player:moved', {
        socketId: socket.id,
        x: data.x,
        y: data.y,
      });
      
      // Also send updated nearby players list to this player
      const nearbyPlayers = getNearbyPlayers(socket.id, CONFIG.PROXIMITY_THRESHOLD_SQ);
      socket.emit('players:nearby', nearbyPlayers.map(p => ({
        socketId: p.socketId,
        nickname: p.nickname,
        avatar: p.avatar,
        x: p.x,
        y: p.y,
        distance: p.distance,
      })));
    });

    // Handle proximity chat messages
    socket.on('chat:message', (data) => {
      const player = players.get(socket.id);
      if (!player) return;

      // Rate limiting
      if (!checkRateLimit(socket.id)) {
        socket.emit('chat:error', { message: 'Too many messages. Please slow down.' });
        return;
      }

      // Validate message
      const message = sanitizeMessage(data.message);
      if (!message) return;

      const chatMessage = {
        id: generateMessageId(),
        senderId: socket.id,
        senderName: player.nickname,
        senderAvatar: player.avatar,
        message: message,
        x: player.x,
        y: player.y,
        timestamp: Date.now(),
      };

      // Send to sender (for confirmation)
      socket.emit('chat:received', chatMessage);

      // Send to nearby players
      const nearbyPlayers = getNearbyPlayers(socket.id, CONFIG.PROXIMITY_THRESHOLD_SQ);
      nearbyPlayers.forEach((nearbyPlayer) => {
        io.to(nearbyPlayer.socketId).emit('chat:received', chatMessage);
      });

      console.log(`[Chat] ${player.nickname}: "${message}" → ${nearbyPlayers.length} nearby players`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const player = players.get(socket.id);
      if (player) {
        console.log(`[Socket] Player disconnected: ${player.nickname} (${socket.id})`);
        
        // Notify others
        socket.broadcast.emit('player:left', { socketId: socket.id });
        
        players.delete(socket.id);
        messageRateLimits.delete(socket.id);
      }

      // Also remove from football ground if present
      if (footballGround.players.has(socket.id)) {
        footballGround.players.delete(socket.id);
        socket.to('football-ground').emit('football:playerLeft', { socketId: socket.id });
        console.log(`[Football] Player disconnected, remaining: ${footballGround.players.size}`);
      }
    });

    // Handle explicit leave
    socket.on('player:leave', () => {
      const player = players.get(socket.id);
      if (player) {
        socket.broadcast.emit('player:left', { socketId: socket.id });
        players.delete(socket.id);
        messageRateLimits.delete(socket.id);
      }
    });

    // ============================================
    // FOOTBALL GROUND EVENTS
    // ============================================

    // Player joins football ground
    socket.on('football:join', (data) => {
      const playerData = {
        socketId: socket.id,
        odId: data.odId,
        nickname: data.odname || 'Player',
        avatar: data.avatar,
        team: data.team || (Math.random() > 0.5 ? 'red' : 'blue'),
        x: data.position?.x || FOOTBALL_CONFIG.FIELD.width / 2,
        y: data.position?.y || FOOTBALL_CONFIG.FIELD.height / 2,
        vx: 0,
        vy: 0,
        lastUpdate: Date.now(),
      };

      // Add to football ground
      footballGround.players.set(socket.id, playerData);
      
      // Join football room for efficient broadcasting
      socket.join('football-ground');

      // Notify others in ground
      socket.to('football-ground').emit('football:playerJoined', playerData);

      // Send current state to new player
      const otherPlayers = [];
      footballGround.players.forEach((p, id) => {
        if (id !== socket.id) {
          otherPlayers.push(p);
        }
      });

      socket.emit('football:playersList', otherPlayers);
      socket.emit('football:gameState', {
        ball: footballGround.ball,
        score: footballGround.score,
        isPlaying: footballGround.isPlaying,
      });

      console.log(`[Football] Player joined: ${playerData.nickname} (${playerData.team}), total: ${footballGround.players.size}`);
    });

    // Player leaves football ground
    socket.on('football:leave', () => {
      if (footballGround.players.has(socket.id)) {
        footballGround.players.delete(socket.id);
        socket.leave('football-ground');
        socket.to('football-ground').emit('football:playerLeft', { socketId: socket.id });
        console.log(`[Football] Player left, remaining: ${footballGround.players.size}`);
      }
    });

    // Player position update in football ground
    socket.on('football:position', (data) => {
      const player = footballGround.players.get(socket.id);
      if (!player) return;

      const now = Date.now();
      if (now - player.lastUpdate < FOOTBALL_CONFIG.POSITION_UPDATE_THROTTLE) return;

      player.x = data.x;
      player.y = data.y;
      player.vx = data.vx || 0;
      player.vy = data.vy || 0;
      player.lastUpdate = now;

      // Broadcast to other players in ground
      socket.to('football-ground').emit('football:playerMoved', {
        socketId: socket.id,
        x: data.x,
        y: data.y,
        vx: data.vx || 0,
        vy: data.vy || 0,
      });
    });

    // Ball kick event
    socket.on('football:kick', (data) => {
      const player = footballGround.players.get(socket.id);
      if (!player || !footballGround.isPlaying) return;

      const now = Date.now();
      
      // Check kick cooldown
      if (player.lastKickTime && now - player.lastKickTime < FOOTBALL_CONFIG.KICK_COOLDOWN) {
        return;
      }

      // Apply kick to ball with spin
      footballGround.ball.vx = data.vx;
      footballGround.ball.vy = data.vy;
      footballGround.ball.spin = data.spin || 0;
      footballGround.ball.lastKickedBy = socket.id;
      footballGround.ball.lastKickTime = now;
      player.lastKickTime = now;

      // Broadcast ball update immediately
      io.to('football-ground').emit('football:ballUpdate', footballGround.ball);
      
      console.log(`[Football] Ball kicked by ${player.nickname} with power ${data.power?.toFixed(1) || 'unknown'}`);
    });
  });

  // ============================================
  // FOOTBALL BALL PHYSICS LOOP (60 FPS)
  // ============================================
  setInterval(() => {
    if (footballGround.players.size === 0) return;
    if (!footballGround.isPlaying) return;

    const ball = footballGround.ball;
    const { width, height, padding, goalWidth, goalDepth } = FOOTBALL_CONFIG.FIELD;
    const goalTop = (height - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;

    // Apply physics
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Apply spin effect (curve)
    if (ball.spin !== 0) {
      ball.vx += ball.vy * ball.spin * 0.01;
      ball.vy -= ball.vx * ball.spin * 0.01;
      ball.spin *= 0.98; // Decay spin
    }
    
    // Apply friction
    ball.vx *= FOOTBALL_CONFIG.BALL_FRICTION;
    ball.vy *= FOOTBALL_CONFIG.BALL_FRICTION;

    // Clamp small velocities
    if (Math.abs(ball.vx) < 0.01) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.01) ball.vy = 0;

    // Clamp max speed
    const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    if (speed > FOOTBALL_CONFIG.BALL_MAX_SPEED) {
      ball.vx = (ball.vx / speed) * FOOTBALL_CONFIG.BALL_MAX_SPEED;
      ball.vy = (ball.vy / speed) * FOOTBALL_CONFIG.BALL_MAX_SPEED;
    }

    // Check for goals
    let goalScored = null;

    // Left goal (blue scores)
    if (ball.x < padding - goalDepth / 2 && ball.y > goalTop && ball.y < goalBottom) {
      goalScored = 'blue';
      footballGround.score.blue++;
    }
    // Right goal (red scores)
    else if (ball.x > width - padding + goalDepth / 2 && ball.y > goalTop && ball.y < goalBottom) {
      goalScored = 'red';
      footballGround.score.red++;
    }

    if (goalScored) {
      footballGround.isPlaying = false;
      
      io.to('football-ground').emit('football:goalScored', {
        team: goalScored,
        score: { ...footballGround.score },
        scoredBy: ball.lastKickedBy,
      });

      console.log(`[Football] GOAL! ${goalScored} team scores! Score: ${footballGround.score.red}-${footballGround.score.blue}`);

      // Reset ball after delay
      setTimeout(() => {
        footballGround.ball = {
          x: width / 2,
          y: height / 2,
          vx: 0,
          vy: 0,
          lastKickedBy: null,
        };
        footballGround.isPlaying = true;
        
        io.to('football-ground').emit('football:gameState', {
          ball: footballGround.ball,
          score: footballGround.score,
          isPlaying: true,
        });
      }, 3000);

      return;
    }

    // Wall collisions (outside goal areas) with bounce
    const bounce = FOOTBALL_CONFIG.BALL_BOUNCE;
    
    // Top/bottom walls
    if (ball.y < padding) {
      ball.y = padding;
      ball.vy *= -bounce;
    }
    if (ball.y > height - padding) {
      ball.y = height - padding;
      ball.vy *= -bounce;
    }

    // Left wall (outside goal)
    if (ball.x < padding && (ball.y < goalTop || ball.y > goalBottom)) {
      ball.x = padding;
      ball.vx *= -bounce;
    }
    // Right wall (outside goal)
    if (ball.x > width - padding && (ball.y < goalTop || ball.y > goalBottom)) {
      ball.x = width - padding;
      ball.vx *= -bounce;
    }

    // Sync ball to clients periodically
    const now = Date.now();
    if (now - footballGround.lastBallSync > FOOTBALL_CONFIG.BALL_SYNC_RATE) {
      io.to('football-ground').emit('football:ballUpdate', ball);
      footballGround.lastBallSync = now;
    }
  }, 16); // ~60 FPS physics

  // Cleanup inactive players periodically
  setInterval(() => {
    const now = Date.now();
    const timeout = 300000; // 5 minutes (increased from 1 minute)
    
    players.forEach((player, socketId) => {
      if (now - player.lastUpdate > timeout) {
        io.to(socketId).emit('connection:timeout');
        io.emit('player:left', { socketId }); // Notify all players
        players.delete(socketId);
      }
    });
  }, 30000);

  console.log('[Socket] Socket.io server initialized');
  return io;
}

/**
 * Get players within proximity (using squared distance)
 */
function getNearbyPlayers(socketId, thresholdSq) {
  const player = players.get(socketId);
  if (!player) return [];

  const nearby = [];
  players.forEach((other, otherId) => {
    if (otherId === socketId) return;
    
    const dx = player.x - other.x;
    const dy = player.y - other.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq <= thresholdSq) {
      nearby.push({ ...other, socketId: otherId, distance: Math.sqrt(distSq) });
    }
  });

  return nearby;
}

/**
 * Rate limiting check
 */
function checkRateLimit(socketId) {
  const now = Date.now();
  const limit = messageRateLimits.get(socketId) || { count: 0, resetTime: now + 1000 };

  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + 1000;
    messageRateLimits.set(socketId, limit);
    return true;
  }

  if (limit.count >= CONFIG.MESSAGE_RATE_LIMIT) {
    return false;
  }

  limit.count++;
  messageRateLimits.set(socketId, limit);
  return true;
}

/**
 * Sanitize and validate message
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return null;
  
  const trimmed = message.trim().slice(0, CONFIG.MESSAGE_MAX_LENGTH);
  if (trimmed.length === 0) return null;
  
  // Basic XSS prevention
  return trimmed
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate unique message ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { initializeSocketServer, CONFIG };
