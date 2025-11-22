# Voxel Battleship

A high-end multiplayer Battleship game with a Voxel/Minecraft aesthetic built with Three.js, Node.js, and Socket.io.

## Tech Stack

### Frontend
- **Three.js** - 3D rendering with voxel-based graphics
- **TypeScript** - Type-safe client code
- **Vite** - Fast development and building
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Server runtime
- **Express** - HTTP server
- **Socket.io** - Real-time game communication
- **TypeScript** - Type-safe server code
- **Prisma ORM** - Database management
- **PostgreSQL** - Persistent data storage
- **Redis** - In-memory game state & session management
- **JWT** - Authentication
- **bcrypt** - Password hashing

## Project Structure

```
voxel-battleship/
├── backend/
│   ├── src/
│   │   ├── controllers/     # HTTP route controllers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express & Socket middleware
│   │   ├── models/          # Data models
│   │   ├── socket/          # Socket.io event handlers
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript type definitions
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── scenes/          # Three.js scenes
│   │   ├── utils/           # Utility functions
│   │   ├── services/        # API & Socket services
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── package.json
```

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start Docker services (PostgreSQL & Redis):**
```bash
npm run docker:up
```

3. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

4. **Run database migrations:**
```bash
npm run prisma:migrate
```

5. **Start development servers:**
```bash
npm run dev
```

This will start both:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Useful Commands

```bash
# Development
npm run dev              # Run both frontend & backend
npm run dev:backend      # Run only backend
npm run dev:client       # Run only frontend

# Docker
npm run docker:up        # Start PostgreSQL & Redis
npm run docker:down      # Stop all services
npm run docker:logs      # View logs

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio GUI

# Production
npm run build            # Build both projects
```

## Development Phases

### ✅ Step 1: Project Setup (Complete)
- Directory structure
- Package configuration
- TypeScript setup
- Docker Compose for PostgreSQL & Redis
- Prisma ORM configuration

### ✅ Step 2: Backend Core (Complete)
- User authentication (Register/Login)
- JWT middleware
- Socket.io setup with authentication
- Redis connection and state management

### ✅ Step 3: Game Logic (Complete)
- Battleship game rules implementation
- Ship placement validation
- Turn management
- Hit detection algorithm
- Win condition checking
- Match persistence

### ✅ Step 4: Frontend Core (Complete)
- Three.js scene setup with lighting
- Voxel rendering system (Minecraft aesthetic)
- Water grid visualization
- Camera controls (OrbitControls)
- UI overlays and screens
- Socket.io client service

### ✅ Step 5: Integration (Complete)
- Complete game application orchestration
- Socket event handling
- Game state synchronization
- Real-time 3D updates
- Ship placement interaction
- Attack phase interaction

## How to Play

### 1. Create an Account
- Enter your email and password
- Click "Register" to create a new account
- Or click "Login" if you already have an account

### 2. Start a Game
- **Create Game**: Click "Create New Game" to generate a room code
- **Join Game**: Click "Join Game" and enter a friend's room code

### 3. Place Your Ships
- Click on the water grid to place each ship
- Press 'R' to rotate between horizontal and vertical
- Place all 5 ships:
  - Carrier (5 cells)
  - Battleship (4 cells)
  - Cruiser (3 cells)
  - Submarine (3 cells)
  - Destroyer (2 cells)
- Click "Confirm Placement" when done

### 4. Battle!
- Take turns with your opponent
- Click on opponent's board to fire shots
- Red markers = Hits
- White markers = Misses
- Sink all enemy ships to win!

### 5. Controls
- **Mouse**: Click to place ships / fire shots
- **R key**: Rotate ship orientation
- **Mouse drag**: Rotate camera view
- **Scroll**: Zoom in/out

## Game Features

### Visual Features
- 🧊 Voxel-based Minecraft aesthetic
- 🌊 Animated water blocks
- 💥 Explosion particle effects on hits
- 🎯 Targeting reticle system
- ✨ Dynamic lighting and shadows
- 🌫️ Atmospheric fog effects
- 🎨 Color-coded ships

### Gameplay Features
- 🎮 Real-time multiplayer
- 🔐 Secure authentication
- 📊 Player statistics tracking
- 💬 Real-time notifications
- 🏆 Match history
- 📱 Responsive design

### Technical Features
- ⚡ Fast real-time updates via Socket.io
- 💾 Persistent data in PostgreSQL
- 🚀 In-memory game state with Redis
- 🔒 JWT authentication
- 📡 WebSocket communication
- 🎨 Three.js 3D rendering

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port
- `CORS_ORIGIN` - Frontend URL for CORS

## License

MIT