import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'tsconfig-paths/register';
// ✅ FIX: Use default import instead of namespace import

console.log('BOOT DATABASE_URL =', process.env.DATABASE_URL);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true, // Automatically transform payloads to DTO instances
  }));

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3001', // Specify exact origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // ✅ Important for session cookies to work
  });

  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();