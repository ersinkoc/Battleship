// Match Service Tests

import { matchService } from '../../../src/services/match.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import { authService } from '../../../src/services/auth.service';
import { MatchStatus } from '@prisma/client';
import { GameRoom } from '../../../src/types';

// Mock auth service
jest.mock('../../../src/services/auth.service');

describe('MatchService', () => {
  const mockMatch = {
    id: 'match-123',
    player1Id: 'player1',
    player2Id: 'player2',
    winnerId: null,
    status: MatchStatus.IN_PROGRESS,
    createdAt: new Date(),
    endedAt: null,
    totalTurns: null,
    player1Shots: null,
    player2Shots: null,
    player1Hits: null,
    player2Hits: null,
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    gamesPlayed: 10,
    gamesWon: 6,
    gamesLost: 4,
    totalShots: 100,
    totalHits: 30,
  };

  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('createMatch', () => {
    it('should create a new match record', async () => {
      mockPrismaClient.match.create.mockResolvedValue(mockMatch);

      const match = await matchService.createMatch('player1', 'player2');

      expect(match).toEqual(mockMatch);
      expect(mockPrismaClient.match.create).toHaveBeenCalledWith({
        data: {
          player1Id: 'player1',
          player2Id: 'player2',
          status: MatchStatus.IN_PROGRESS,
        },
      });
    });

    it('should set status to IN_PROGRESS', async () => {
      mockPrismaClient.match.create.mockResolvedValue(mockMatch);

      const match = await matchService.createMatch('player1', 'player2');

      expect(match.status).toBe(MatchStatus.IN_PROGRESS);
    });
  });

  describe('completeMatch', () => {
    const gameStats = {
      player1: { shots: 50, hits: 17, misses: 33 },
      player2: { shots: 45, hits: 15, misses: 30 },
    };

    it('should complete match with winner', async () => {
      const completedMatch = {
        ...mockMatch,
        winnerId: 'player1',
        status: MatchStatus.COMPLETED,
        endedAt: new Date(),
      };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue(completedMatch);
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      const result = await matchService.completeMatch('match-123', 'player1', gameStats);

      expect(result.winnerId).toBe('player1');
      expect(result.status).toBe(MatchStatus.COMPLETED);
      expect(mockPrismaClient.match.update).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        data: {
          status: MatchStatus.COMPLETED,
          winnerId: 'player1',
          endedAt: expect.any(Date),
          totalTurns: 95,
          player1Shots: 50,
          player2Shots: 45,
          player1Hits: 17,
          player2Hits: 15,
        },
      });
    });

    it('should update winner stats', async () => {
      const completedMatch = { ...mockMatch, winnerId: 'player1', status: MatchStatus.COMPLETED };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue(completedMatch);
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      await matchService.completeMatch('match-123', 'player1', gameStats);

      expect(authService.updateUserStats).toHaveBeenCalledWith('player1', true, 50, 17);
    });

    it('should update loser stats', async () => {
      const completedMatch = { ...mockMatch, winnerId: 'player1', status: MatchStatus.COMPLETED };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue(completedMatch);
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      await matchService.completeMatch('match-123', 'player1', gameStats);

      expect(authService.updateUserStats).toHaveBeenCalledWith('player2', false, 45, 15);
    });

    it('should calculate total turns correctly', async () => {
      const completedMatch = { ...mockMatch, status: MatchStatus.COMPLETED };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue(completedMatch);
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      await matchService.completeMatch('match-123', 'player1', gameStats);

      expect(mockPrismaClient.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTurns: 95, // 50 + 45
          }),
        })
      );
    });

    it('should throw error if match not found', async () => {
      mockPrismaClient.match.findUnique.mockResolvedValue(null);

      await expect(matchService.completeMatch('nonexistent', 'player1', gameStats)).rejects.toThrow(
        'Match not found'
      );
    });

    it('should handle missing game stats', async () => {
      const completedMatch = { ...mockMatch, status: MatchStatus.COMPLETED };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue(completedMatch);
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      await matchService.completeMatch('match-123', 'player1', {});

      expect(mockPrismaClient.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            player1Shots: 0,
            player2Shots: 0,
            player1Hits: 0,
            player2Hits: 0,
          }),
        })
      );
    });
  });

  describe('abandonMatch', () => {
    it('should mark match as abandoned', async () => {
      const abandonedMatch = {
        ...mockMatch,
        status: MatchStatus.ABANDONED,
        endedAt: new Date(),
      };

      mockPrismaClient.match.update.mockResolvedValue(abandonedMatch);

      const result = await matchService.abandonMatch('match-123');

      expect(result.status).toBe(MatchStatus.ABANDONED);
      expect(result.endedAt).toBeDefined();
      expect(mockPrismaClient.match.update).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        data: {
          status: MatchStatus.ABANDONED,
          endedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getMatchById', () => {
    it('should retrieve match with players', async () => {
      const matchWithPlayers = {
        ...mockMatch,
        player1: mockUser,
        player2: mockUser,
      };

      mockPrismaClient.match.findUnique.mockResolvedValue(matchWithPlayers);

      const match = await matchService.getMatchById('match-123');

      expect(match).toEqual(matchWithPlayers);
      expect(mockPrismaClient.match.findUnique).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        include: {
          player1: true,
          player2: true,
        },
      });
    });

    it('should return null if match not found', async () => {
      mockPrismaClient.match.findUnique.mockResolvedValue(null);

      const match = await matchService.getMatchById('nonexistent');

      expect(match).toBeNull();
    });
  });

  describe('getUserMatches', () => {
    it('should retrieve user match history', async () => {
      const matches = [mockMatch, { ...mockMatch, id: 'match-456' }];
      mockPrismaClient.match.findMany.mockResolvedValue(matches);

      const result = await matchService.getUserMatches('user-123');

      expect(result).toEqual(matches);
      expect(mockPrismaClient.match.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ player1Id: 'user-123' }, { player2Id: 'user-123' }],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 0,
        include: {
          player1: true,
          player2: true,
        },
      });
    });

    it('should support pagination', async () => {
      mockPrismaClient.match.findMany.mockResolvedValue([]);

      await matchService.getUserMatches('user-123', 20, 10);

      expect(mockPrismaClient.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });

    it('should use default limit and offset', async () => {
      mockPrismaClient.match.findMany.mockResolvedValue([]);

      await matchService.getUserMatches('user-123');

      expect(mockPrismaClient.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        })
      );
    });
  });

  describe('getUserWinRate', () => {
    it('should calculate win rate correctly', async () => {
      const matches = [
        { ...mockMatch, winnerId: 'user-123', status: MatchStatus.COMPLETED },
        { ...mockMatch, winnerId: 'user-123', status: MatchStatus.COMPLETED },
        { ...mockMatch, winnerId: 'other-user', status: MatchStatus.COMPLETED },
        { ...mockMatch, winnerId: 'other-user', status: MatchStatus.COMPLETED },
      ];

      mockPrismaClient.match.findMany.mockResolvedValue(matches);

      const winRate = await matchService.getUserWinRate('user-123');

      expect(winRate).toBe(50); // 2 wins out of 4 matches
    });

    it('should return 0 for user with no matches', async () => {
      mockPrismaClient.match.findMany.mockResolvedValue([]);

      const winRate = await matchService.getUserWinRate('user-123');

      expect(winRate).toBe(0);
    });

    it('should only count completed matches', async () => {
      mockPrismaClient.match.findMany.mockResolvedValue([]);

      await matchService.getUserWinRate('user-123');

      expect(mockPrismaClient.match.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ player1Id: 'user-123' }, { player2Id: 'user-123' }],
          status: MatchStatus.COMPLETED,
        },
      });
    });

    it('should handle all wins', async () => {
      const matches = [
        { ...mockMatch, winnerId: 'user-123', status: MatchStatus.COMPLETED },
        { ...mockMatch, winnerId: 'user-123', status: MatchStatus.COMPLETED },
      ];

      mockPrismaClient.match.findMany.mockResolvedValue(matches);

      const winRate = await matchService.getUserWinRate('user-123');

      expect(winRate).toBe(100);
    });

    it('should handle all losses', async () => {
      const matches = [
        { ...mockMatch, winnerId: 'other-user', status: MatchStatus.COMPLETED },
        { ...mockMatch, winnerId: 'other-user', status: MatchStatus.COMPLETED },
      ];

      mockPrismaClient.match.findMany.mockResolvedValue(matches);

      const winRate = await matchService.getUserWinRate('user-123');

      expect(winRate).toBe(0);
    });
  });

  describe('createMatchFromRoom', () => {
    it('should create match from game room', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        player2Id: 'player2',
        status: 'playing',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      mockPrismaClient.match.create.mockResolvedValue(mockMatch);

      const matchId = await matchService.createMatchFromRoom(room);

      expect(matchId).toBe('match-123');
      expect(mockPrismaClient.match.create).toHaveBeenCalled();
    });

    it('should return null if player1 missing', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: '',
        player2Id: 'player2',
        status: 'playing',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      const matchId = await matchService.createMatchFromRoom(room);

      expect(matchId).toBeNull();
      expect(mockPrismaClient.match.create).not.toHaveBeenCalled();
    });

    it('should return null if player2 missing', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        status: 'playing',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      const matchId = await matchService.createMatchFromRoom(room);

      expect(matchId).toBeNull();
      expect(mockPrismaClient.match.create).not.toHaveBeenCalled();
    });
  });

  describe('completeMatchFromRoom', () => {
    it('should complete match from game room', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        player2Id: 'player2',
        status: 'finished',
        matchId: 'match-123',
        winnerId: 'player1',
        boards: {},
        playersReady: {},
        gameStats: {
          player1: { shots: 50, hits: 17, misses: 33 },
          player2: { shots: 45, hits: 15, misses: 30 },
        },
        createdAt: Date.now(),
      };

      mockPrismaClient.match.findUnique.mockResolvedValue(mockMatch);
      mockPrismaClient.match.update.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.COMPLETED,
      });
      (authService.updateUserStats as jest.Mock).mockResolvedValue(undefined);

      await matchService.completeMatchFromRoom(room);

      expect(mockPrismaClient.match.findUnique).toHaveBeenCalledWith({
        where: { id: 'match-123' },
      });
    });

    it('should do nothing if matchId missing', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        player2Id: 'player2',
        status: 'finished',
        winnerId: 'player1',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      await matchService.completeMatchFromRoom(room);

      expect(mockPrismaClient.match.findUnique).not.toHaveBeenCalled();
    });

    it('should do nothing if winnerId missing', async () => {
      const room: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        player2Id: 'player2',
        status: 'finished',
        matchId: 'match-123',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      await matchService.completeMatchFromRoom(room);

      expect(mockPrismaClient.match.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should retrieve top players', async () => {
      const users = [
        { ...mockUser, id: 'user1', gamesWon: 10 },
        { ...mockUser, id: 'user2', gamesWon: 8 },
        { ...mockUser, id: 'user3', gamesWon: 5 },
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(users);

      const leaderboard = await matchService.getLeaderboard(10);

      expect(leaderboard).toHaveLength(3);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        orderBy: {
          gamesWon: 'desc',
        },
        take: 10,
        select: {
          id: true,
          email: true,
          gamesPlayed: true,
          gamesWon: true,
          gamesLost: true,
          totalShots: true,
          totalHits: true,
        },
      });
    });

    it('should calculate win rate', async () => {
      const users = [
        {
          id: 'user1',
          email: 'user1@example.com',
          gamesPlayed: 10,
          gamesWon: 6,
          gamesLost: 4,
          totalShots: 100,
          totalHits: 30,
        },
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(users);

      const leaderboard = await matchService.getLeaderboard(10);

      expect(leaderboard[0].winRate).toBe('60.00');
    });

    it('should calculate accuracy', async () => {
      const users = [
        {
          id: 'user1',
          email: 'user1@example.com',
          gamesPlayed: 10,
          gamesWon: 6,
          gamesLost: 4,
          totalShots: 100,
          totalHits: 30,
        },
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(users);

      const leaderboard = await matchService.getLeaderboard(10);

      expect(leaderboard[0].accuracy).toBe('30.00');
    });

    it('should handle users with no games', async () => {
      const users = [
        {
          id: 'user1',
          email: 'user1@example.com',
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          totalShots: 0,
          totalHits: 0,
        },
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(users);

      const leaderboard = await matchService.getLeaderboard(10);

      expect(leaderboard[0].winRate).toBe('0.00');
      expect(leaderboard[0].accuracy).toBe('0.00');
    });

    it('should support custom limit', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([]);

      await matchService.getLeaderboard(20);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });
});
