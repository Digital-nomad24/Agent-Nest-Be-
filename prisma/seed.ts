import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Check if database already has data
  const userCount = await prisma.user.count();
  
  if (userCount > 0) {
    console.log('⚠️  Database already contains data. Skipping seed.');
    console.log(`   Found ${userCount} users in the database.`);
    return;
  }
  
  console.log('📭 Database is empty. Starting seed...');
  
  // Hash password for users
  const hashedPassword = 'test12345';
  
  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'robot@gmail.com',
      name: 'Mr Robot',
      password: hashedPassword,
    },
  });
  
  console.log('✅ Created users');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });