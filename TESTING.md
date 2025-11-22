# Testing Strategy - Voxel Battleship

## 🎯 Goal: 100% Test Coverage & 100% Success Rate

This document outlines the comprehensive testing strategy for achieving complete code coverage.

## 📊 Testing Infrastructure

### Backend (Node.js + TypeScript)
- **Framework**: Jest with ts-jest
- **API Testing**: Supertest
- **Coverage Tool**: Istanbul (built into Jest)
- **Mocking**: Jest mocks for Prisma, Redis, Socket.io

### Frontend (TypeScript + Three.js)
- **Framework**: Vitest
- **Component Testing**: @testing-library/dom
- **Coverage Tool**: c8
- **Mocking**: Vitest mocks for Three.js, Socket.io-client

## 🧪 Test Structure

```
backend/tests/
├── unit/
│   ├── utils/
│   │   ├── jwt.util.test.ts
│   │   ├── password.util.test.ts
│   │   ├── validation.util.test.ts
│   │   ├── coordinate.util.test.ts
│   │   └── ship.util.test.ts
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── game.service.test.ts
│   │   ├── match.service.test.ts
│   │   └── redis.service.test.ts
│   ├── middleware/
│   │   ├── auth.middleware.test.ts
│   │   └── socket.middleware.test.ts
│   └── controllers/
│       └── auth.controller.test.ts
├── integration/
│   ├── auth.integration.test.ts
│   ├── game.integration.test.ts
│   └── socket.integration.test.ts
├── mocks/
│   ├── prisma.mock.ts
│   ├── redis.mock.ts
│   └── socket.mock.ts
└── setup.ts

client/tests/
├── unit/
│   ├── utils/
│   │   └── voxel.util.test.ts
│   ├── services/
│   │   ├── api.service.test.ts
│   │   ├── socket.service.test.ts
│   │   └── GameState.test.ts
│   ├── scenes/
│   │   ├── SceneManager.test.ts
│   │   └── GameBoard.test.ts
│   └── components/
│       └── UIController.test.ts
├── integration/
│   └── Game.integration.test.ts
└── setup.ts
```

## ✅ Testing Checklist

### Backend Unit Tests (100% Coverage)

#### Utils
- [x] JWT token generation
- [x] JWT token verification
- [x] JWT token extraction
- [x] Password hashing
- [x] Password comparison
- [x] Password strength validation
- [x] Email validation
- [x] Room code validation
- [x] Coordinate validation
- [x] Ship placement validation
- [x] Hit detection
- [x] Win condition checking

#### Services
- [x] Auth service (register, login, profile)
- [x] Game service (room management, ship placement, shots)
- [x] Match service (CRUD, statistics)
- [x] Redis service (all operations)
- [x] Database service (connection, health)

#### Middleware
- [x] Auth middleware (token validation)
- [x] Socket middleware (connection auth)

#### Controllers
- [x] Auth controller (register, login, profile, health)

#### Socket Handlers
- [x] Connection handler
- [x] Room handler (create, join, leave)
- [x] Game handler (place ships, fire shot, game state)

### Backend Integration Tests

- [x] Complete auth flow (register → login → protected route)
- [x] Complete game flow (create → join → place ships → battle → game over)
- [x] Socket.io connection and events
- [x] Database transactions
- [x] Redis state management

### Frontend Unit Tests (100% Coverage)

#### Utils
- [x] Voxel creation and rendering
- [x] Coordinate conversion
- [x] Grid generation

#### Services
- [x] API service (all endpoints)
- [x] Socket service (all events)
- [x] Game state (all state mutations)

#### Scenes
- [x] Scene manager (setup, animation, raycasting)
- [x] Game board (rendering, interaction)

#### Components
- [x] UI controller (all screens and transitions)

### Frontend Integration Tests

- [x] Complete game flow
- [x] Socket event handling
- [x] State synchronization

## 🚀 Running Tests

### Backend

```bash
# Run all tests with coverage
cd backend
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage with 100% threshold
npm run test:coverage
```

### Frontend

```bash
# Run all tests with coverage
cd client
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📈 Coverage Requirements

All modules must achieve:
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

## 🔍 Test Examples

### Unit Test Example (Utils)

```typescript
describe('JWT Utils', () => {
  it('should generate valid JWT token', () => {
    const token = generateToken('user123', 'test@example.com');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should verify valid token', () => {
    const token = generateToken('user123', 'test@example.com');
    const decoded = verifyToken(token);
    expect(decoded).toEqual({
      userId: 'user123',
      email: 'test@example.com',
    });
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid-token');
    expect(decoded).toBeNull();
  });
});
```

### Integration Test Example

```typescript
describe('Auth Integration', () => {
  it('should complete full auth flow', async () => {
    // Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test1234' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // Access protected route
    const profileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.email).toBe('test@example.com');
  });
});
```

## 🎯 Success Criteria

- ✅ All tests pass (100% success rate)
- ✅ 100% code coverage on all metrics
- ✅ No console errors or warnings
- ✅ All edge cases covered
- ✅ All error paths tested
- ✅ Integration tests cover complete user flows
- ✅ Performance benchmarks met

## 📝 Notes

- Tests run in isolated environment
- Database/Redis mocked for unit tests
- Real connections for integration tests (test database)
- All async operations properly handled
- Cleanup after each test
- No test interdependencies

## 🔧 CI/CD Integration

Tests should be run:
1. On every commit (pre-commit hook)
2. On every pull request
3. Before deployment

Coverage reports should be:
- Generated on every test run
- Published to coverage service (Codecov/Coveralls)
- Enforced as merge requirement (100% threshold)
