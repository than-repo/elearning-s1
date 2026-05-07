// prisma.config.ts
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import path from 'path';

// Load to specific .development.env file
const envFilePath = path.resolve(process.cwd(), '.development.env');

config({
  path: envFilePath,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
