# Voxel Battleship - Backend

Node.js + TypeScript backend server for the Voxel Battleship game.

## Architecture

```
backend/src/
├── controllers/       # HTTP route handlers
│   └── auth.controller.ts
├── services/         # Business logic
│   ├── auth.service.ts
│   ├── database.service.ts
│   └── redis.service.ts
├── middleware/       # Express & Socket middleware
│   ├── auth.middleware.ts
│   └── socket.middleware.ts
├── socket/           # Socket.io event handlers
│   ├── index.ts
│   └── handlers/
│       ├── connection.handler.ts
│       └── room.handler.ts
├── utils/            # Utility functions
│   ├── jwt.util.ts
│   ├── password.util.ts
│   └── validation.util.ts
├── types/            # TypeScript definitions
│   └── index.ts
├── routes/           # Route definitions
│   └── auth.routes.ts
├── app.ts            # Express app setup
└── index.ts          # Main entry point
```

## Features Implemented (Step 2)

### Authentication System
- User registration with email/password
- Password hashing using bcrypt (10 salt rounds)
- JWT token generation and verification
- Login endpoint with credential validation
- Protected routes with JWT middleware

### Database (Prisma + PostgreSQL)
- User model with stats tracking
- Match history model
- Type-safe database queries
- Connection pooling and health checks

### Redis Integration
- Game room state management
- Socket session storage
- User-to-socket mapping
- Room-to-users mapping
- Automatic expiry for sessions

### Socket.io Server
- WebSocket authentication via JWT
- Room creation with unique 6-character codes
- Room joining with validation
- Real-time player notifications
- Graceful disconnect handling

### Security Features
- Password strength validation (min 8 chars, uppercase, lowercase, number)
- JWT token expiry (configurable)
- CORS protection
- Request validation using Zod schemas
- Secure password hashing

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 201 Created
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "stats": { ... }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 200 OK
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

#### Get Profile (Protected)
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Profile retrieved",
  "user": { ... }
}
```

#### Health Check
```http
GET /api/health

Response: 200 OK
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Socket.io Events

### Client → Server

#### Create Room
```typescript
socket.emit('createRoom');
// Response: 'roomCreated' event with room code
```

#### Join Room
```typescript
socket.emit('joinRoom', 'ABC123');
// Responses: 'gameStarted' event or 'error'
```

#### Leave Room
```typescript
socket.emit('leaveRoom');
```

### Server → Client

#### Room Created
```typescript
socket.on('roomCreated', (roomCode: string) => {
  console.log('Room created:', roomCode);
});
```

#### Player Joined
```typescript
socket.on('playerJoined', (data: { playerId: string; email: string }) => {
  console.log('Player joined:', data);
});
```

#### Game Started
```typescript
socket.on('gameStarted', (data: { message: string }) => {
  console.log('Game ready:', data.message);
});
```

#### Opponent Left
```typescript
socket.on('opponentLeft', (data: { message: string }) => {
  console.log('Opponent left:', data.message);
});
```

#### Error
```typescript
socket.on('error', (message: string) => {
  console.error('Socket error:', message);
});
```

## Connection Authentication

Socket.io connections require JWT authentication:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

## Environment Variables

See `backend/.env.example` for all configuration options:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 4000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRES_IN` - Token expiry time (e.g., '7d')
- `CORS_ORIGIN` - Allowed CORS origin

## Development

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server (auto-reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Database Management

```bash
# Create new migration
npm run prisma:migrate

# Open Prisma Studio (GUI)
npm run prisma:studio

# Push schema without migration
npm run prisma:push
```

## Next Steps (Step 3)

- Implement ship placement logic
- Add turn-based game mechanics
- Implement shot validation
- Add win condition checking
- Store match results in database
- Real-time game state synchronization
