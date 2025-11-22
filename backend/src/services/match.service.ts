// Match service for database operations

import { Match, MatchStatus } from '@prisma/client';
import { prisma } from './database.service';
import { GameRoom } from '../types';
import { authService } from './auth.service';

class MatchService {
  /**
   * Create a new match record when game starts
   */
  async createMatch(player1Id: string, player2Id: string): Promise<Match> {
    const match = await prisma.match.create({
      data: {
        player1Id,
        player2Id,
        status: MatchStatus.IN_PROGRESS,
      },
    });

    return match;
  }

  /**
   * Update match with final results
   */
  async completeMatch(
    matchId: string,
    winnerId: string,
    gameStats: {
      [playerId: string]: {
        shots: number;
        hits: number;
        misses: number;
      };
    }
  ): Promise<Match> {
    // Get match to determine players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Calculate stats for each player
    const player1Stats = gameStats[match.player1Id] || { shots: 0, hits: 0, misses: 0 };
    const player2Stats = gameStats[match.player2Id] || { shots: 0, hits: 0, misses: 0 };

    // Calculate total turns (sum of both players' shots)
    const totalTurns = player1Stats.shots + player2Stats.shots;

    // Update match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        winnerId,
        endedAt: new Date(),
        totalTurns,
        player1Shots: player1Stats.shots,
        player2Shots: player2Stats.shots,
        player1Hits: player1Stats.hits,
        player2Hits: player2Stats.hits,
      },
    });

    // Update user stats
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

    // Safely get stats with defaults for missing data
    const winnerStats = gameStats[winnerId] || { shots: 0, hits: 0 };
    const loserStats = gameStats[loserId] || { shots: 0, hits: 0 };

    await authService.updateUserStats(
      winnerId,
      true,
      winnerStats.shots,
      winnerStats.hits
    );

    await authService.updateUserStats(
      loserId,
      false,
      loserStats.shots,
      loserStats.hits
    );

    return updatedMatch;
  }

  /**
   * Mark match as abandoned
   */
  async abandonMatch(matchId: string): Promise<Match> {
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.ABANDONED,
        endedAt: new Date(),
      },
    });

    return updatedMatch;
  }

  /**
   * Get match by ID
   */
  async getMatchById(matchId: string): Promise<Match | null> {
    return await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
      },
    });
  }

  /**
   * Get user's match history
   */
  async getUserMatches(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Match[]> {
    return await prisma.match.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        player1: true,
        player2: true,
      },
    });
  }

  /**
   * Get user's win rate
   */
  async getUserWinRate(userId: string): Promise<number> {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: MatchStatus.COMPLETED,
      },
    });

    if (matches.length === 0) return 0;

    const wins = matches.filter((m) => m.winnerId === userId).length;
    return (wins / matches.length) * 100;
  }

  /**
   * Create match from game room when game starts
   */
  async createMatchFromRoom(room: GameRoom): Promise<string | null> {
    if (!room.player1Id || !room.player2Id) return null;

    const match = await this.createMatch(room.player1Id, room.player2Id);
    return match.id;
  }

  /**
   * Complete match from game room
   */
  async completeMatchFromRoom(room: GameRoom): Promise<void> {
    if (!room.matchId || !room.winnerId) return;

    await this.completeMatch(room.matchId, room.winnerId, room.gameStats);
  }

  /**
   * Get leaderboard (top players by wins)
   */
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const users = await prisma.user.findMany({
      orderBy: {
        gamesWon: 'desc',
      },
      take: limit,
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

    return users.map((user) => ({
      ...user,
      winRate:
        user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(2) : '0.00',
      accuracy:
        user.totalShots > 0 ? ((user.totalHits / user.totalShots) * 100).toFixed(2) : '0.00',
    }));
  }
}

export const matchService = new MatchService();
