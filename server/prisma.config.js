const { defineConfig, env } = require('prisma/config');
require('dotenv/config');

module.exports = defineConfig({
  experimental: {
    adapter: true,
  },
  engine: 'js',
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
