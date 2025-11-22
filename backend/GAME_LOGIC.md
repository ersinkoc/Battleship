# Game Logic Documentation

This document describes the complete game logic implementation for Voxel Battleship.

## Game Flow

### 1. Room Creation & Joining
- Player 1 creates a room → receives unique 6-character code
- Player 2 joins using the code
- Room status changes: `waiting` → `setup`

### 2. Ship Placement Phase
- Both players place 5 ships on their 10x10 board
- Ships cannot overlap or go out of bounds
- Once both players place ships: `setup` → `playing`
- Match record created in database
- First player randomly selected

### 3. Battle Phase
- Players take turns firing shots at coordinates
- Server validates each shot (not already attacked, valid turn)
- Results: `miss`, `hit`, or `sunk`
- Turn switches after each shot
- Game continues until all ships of one player are sunk

### 4. Game Over
- Winner determined when all opponent ships sunk
- Match completed in database
- User stats updated (games played/won, shots, hits)
- Room cleaned up after 30 seconds

## Ship Configuration

Classic Battleship rules with 5 ships:

| Ship        | Size | Quantity |
|-------------|------|----------|
| Carrier     | 5    | 1        |
| Battleship  | 4    | 1        |
| Cruiser     | 3    | 1        |
| Submarine   | 3    | 1        |
| Destroyer   | 2    | 1        |

**Total cells occupied:** 17 out of 100

## Board Specifications

- **Size:** 10x10 grid
- **Coordinates:** x: 0-9, y: 0-9
- **Display:** A-J (x-axis), 1-10 (y-axis)
- **Orientations:** Horizontal or Vertical

## Validation Rules

### Ship Placement Validation

1. **Ship Type Validation**
   - Must be one of the 5 required ship types
   - Size must match ship definition

2. **Boundary Validation**
   - All ship coordinates must be within 0-9 range
   - Ships cannot extend beyond board edges

3. **Overlap Prevention**
   - Ships cannot occupy the same coordinates
   - Each cell can only contain one ship segment

4. **Complete Set Requirement**
   - All 5 ships must be placed
   - No duplicates or missing ships

### Shot Validation

1. **Turn Validation**
   - Shot only allowed on player's turn
   - Game must be in `playing` status

2. **Coordinate Validation**
   - Must be within board boundaries
   - Cannot attack same coordinate twice

3. **Game State Validation**
   - Room must exist
   - Both players must be present

## Game State Management

### Redis Storage

Game state stored in Redis with 1-hour TTL:

```typescript
GameRoom {
  roomCode: string              // 6-character code
  player1Id: string             // User ID
  player2Id?: string            // User ID
  status: 'waiting' | 'setup' | 'playing' | 'finished'
  currentTurn?: string          // Current player's ID
  boards: {
    [playerId]: {
      ships: Ship[]             // Ship positions & status
      hits: Coordinate[]        // Successful attacks
      misses: Coordinate[]      // Failed attacks
    }
  }
  playersReady: {
    [playerId]: boolean         // Ship placement complete
  }
  gameStats: {
    [playerId]: {
      shots: number
      hits: number
      misses: number
    }
  }
  createdAt: number
  startedAt?: number
  matchId?: string              // Database reference
  winnerId?: string
}
```

### Database Storage (PostgreSQL)

Persistent match records:

```sql
Match {
  id: UUID
  player1Id: UUID
  player2Id: UUID
  winnerId?: UUID
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  totalTurns: Int
  player1Shots: Int
  player2Shots: Int
  player1Hits: Int
  player2Hits: Int
  createdAt: DateTime
  endedAt?: DateTime
}
```

## Socket.io Events

### Game Setup Events

#### Client → Server: `placeShips`
```typescript
socket.emit('placeShips', [
  {
    id: 'carrier',
    name: 'Carrier',
    size: 5,
    startCoordinate: { x: 0, y: 0 },
    orientation: 'horizontal'
  },
  // ... 4 more ships
]);
```

#### Server → Client: `shipsPlaced`
```typescript
socket.on('shipsPlaced', (data) => {
  // data: { playerId: string, ready: boolean }
});
```

#### Server → Client: `bothPlayersReady`
```typescript
socket.on('bothPlayersReady', (data) => {
  // data: { firstPlayer: string, message: string }
});
```

### Gameplay Events

#### Client → Server: `fireShot`
```typescript
socket.emit('fireShot', { x: 5, y: 7 });
```

#### Server → Client: `shotResult`
```typescript
socket.on('shotResult', (data) => {
  // data: {
  //   coordinate: { x, y },
  //   result: 'hit' | 'miss' | 'sunk',
  //   shipName?: string,
  //   attacker: string,
  //   defender: string
  // }
});
```

#### Server → Client: `turnChanged`
```typescript
socket.on('turnChanged', (data) => {
  // data: { currentPlayer: string, isYourTurn: boolean }
});
```

#### Server → Client: `shipSunk`
```typescript
socket.on('shipSunk', (data) => {
  // data: { shipName: string, playerId: string }
});
```

#### Server → Client: `gameOver`
```typescript
socket.on('gameOver', (data) => {
  // data: {
  //   winnerId: string,
  //   winnerEmail: string,
  //   loserId: string,
  //   reason: 'all_ships_sunk' | 'opponent_left' | 'timeout',
  //   stats: { [playerId]: { shots, hits, misses, shipsRemaining } }
  // }
});
```

### State Synchronization

#### Client → Server: `requestGameState`
```typescript
socket.emit('requestGameState');
```

#### Server → Client: `gameState`
```typescript
socket.on('gameState', (data) => {
  // data: {
  //   roomCode: string,
  //   status: string,
  //   currentTurn?: string,
  //   players: { player1, player2? },
  //   yourBoard?: { ships, opponentHits, opponentMisses },
  //   opponentBoard?: { yourHits, yourMisses, sunkShips }
  // }
});
```

## Coordinate System

### Internal Representation
```typescript
{ x: number, y: number }  // 0-indexed
```

### Display Representation
```
   A B C D E F G H I J
1  . . . . . . . . . .
2  . . . . . . . . . .
3  . . . . . . . . . .
4  . . . . . . . . . .
5  . . . . . . . . . .
6  . . . . . . . . . .
7  . . . . . . . . . .
8  . . . . . . . . . .
9  . . . . . . . . . .
10 . . . . . . . . . .
```

### Utility Functions

```typescript
// Convert coordinate to display string
coordinateToString({ x: 0, y: 0 }) // → "A1"
coordinateToString({ x: 9, y: 9 }) // → "J10"

// Parse display string to coordinate
parseCoordinate("A1")  // → { x: 0, y: 0 }
parseCoordinate("J10") // → { x: 9, y: 9 }
```

## Hit Detection Algorithm

1. **Receive shot coordinate** from player
2. **Validate turn** - ensure it's player's turn
3. **Check previous attacks** - coordinate not already hit/missed
4. **Search defender's ships** for coordinate match
5. **If hit:**
   - Add to `hits` array
   - Increment ship's hit counter
   - Check if `hits >= size` → mark as sunk
   - Check if all ships sunk → game over
6. **If miss:**
   - Add to `misses` array
7. **Update stats** (shots, hits, misses)
8. **Switch turns**
9. **Broadcast result** to both players

## Win Condition

A player wins when:
- All opponent ships are sunk (`ship.isSunk === true` for all ships)
- Checked after every successful hit
- Alternative: Opponent disconnects (forfeit)

## Statistics Tracking

### Real-time (Redis)
- Shots fired
- Hits landed
- Misses

### Persistent (PostgreSQL)
- Games played
- Games won/lost
- Total shots across all games
- Total hits across all games
- Win rate calculation
- Accuracy percentage

## Error Handling

All game operations return structured responses:

```typescript
// Success
{ success: true, result?: any }

// Failure
{ success: false, error: string }
```

Common error scenarios:
- Invalid ship placement
- Out of turn shot
- Duplicate coordinate attack
- Room not found
- Player not in room
- Invalid coordinate

## Security Considerations

1. **Server-side validation** - Never trust client data
2. **Turn enforcement** - Player can only act on their turn
3. **Board privacy** - Players cannot see opponent ship positions
4. **Coordinate validation** - All coordinates checked for bounds
5. **State consistency** - Redis and database kept in sync

## Performance Optimizations

1. **Redis caching** - Active game state in memory
2. **Batch operations** - Multiple Redis operations combined
3. **Async processing** - Non-blocking I/O
4. **Connection pooling** - Database connections reused
5. **Event-driven** - Socket.io for real-time updates
6. **TTL expiry** - Automatic cleanup of old rooms

## Testing Checklist

- [ ] Ship placement validation
- [ ] Shot validation and hit detection
- [ ] Turn management
- [ ] Win condition checking
- [ ] Database persistence
- [ ] Redis state management
- [ ] Socket event handling
- [ ] Error scenarios
- [ ] Disconnection handling
- [ ] Statistics calculation
