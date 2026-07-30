import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

/**
 * Prisma 7: adaptörsüz `new PrismaClient()` tip hatası verir.
 * WebSocket adaptörü (PrismaNeon) kullanılıyor — HTTP adaptörü (PrismaNeonHttp)
 * transaction desteklemediği için upsert/nested write'larda çalışma anında patlar.
 */
const clientOlustur = () =>
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  })

// Dev'de hot reload her seferinde yeni bağlantı açmasın diye global'de tutulur.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof clientOlustur>
}

export const prisma = globalForPrisma.prisma ?? clientOlustur()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
