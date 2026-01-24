import { Module } from '@nestjs/common';
import { GoogleController } from './google.controller';
import { SERVICE_PROVIDER } from './services/service.provider';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from 'src/auth/strategy/google.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [GoogleController],
  providers: [...SERVICE_PROVIDER,GoogleStrategy],
  exports:[...SERVICE_PROVIDER,GoogleStrategy]
})
export class GoogleModule {}
