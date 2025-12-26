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
  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
