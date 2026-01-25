import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['warn', 'error'], // avoid noisy info logs
    });
  }

  // ❌ REMOVE onModuleInit completely
  // Prisma will lazily connect on first query

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Prisma disconnected from PostgreSQL');
  }
}
