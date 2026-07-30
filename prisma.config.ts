import 'dotenv/config'
import path from 'node:path'
import type { PrismaConfig } from 'prisma'

// Prisma 7: bağlantı adresi artık schema.prisma'daki datasource bloğunda değil,
// yalnızca burada tanımlanır.
export default {
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
} satisfies PrismaConfig
