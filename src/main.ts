import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'tsconfig-paths/register'; // ← Add this as the FIRST line

console.log('BOOT DATABASE_URL =', process.env.DATABASE_URL);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist:true
  }))
  app.enableCors({
    origin: ['http://localhost:8080','http://localhost:8000'], // frontend URL
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
