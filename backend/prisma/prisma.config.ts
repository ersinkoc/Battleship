import { defineConfig } from '@prisma/client/runtime/config';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://battleship:battleship@localhost:5432/battleship',
    },
  },
});
