import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import 'tsconfig-paths/register';

console.log('BOOT DATABASE_URL =', process.env.DATABASE_URL);

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server)
  );
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));
  
  app.enableCors({
    origin: ['http://localhost:8080', 'http://localhost:8000', process.env.FRONTEND_URL].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.init();
  return app;
}

// For Vercel serverless
export default async (req, res) => {
  await bootstrap();
  server(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT ?? 3333;
  bootstrap().then(() => {
    server.listen(port, () => {
      console.log(`Application running on port ${port}`);
    });
  });
}