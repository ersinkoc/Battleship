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

### 🔄 Step 2: Backend Core (Next)
- User authentication (Register/Login)
- JWT middleware
- Basic Socket.io setup
- Redis connection

### 📋 Step 3: Game Logic (Planned)
- Battleship game rules
- Ship placement validation
- Turn management
- Win condition checking

### 📋 Step 4: Frontend Core (Planned)
- Three.js scene setup
- Voxel rendering
- Camera controls
- UI overlays

### 📋 Step 5: Integration (Planned)
- Socket event handling
- Game state synchronization
- Real-time updates

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