import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { JwtStrategy } from './strategy';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthController } from './controllers/auth.controller';
import { UseCaseProvider } from './use-cases/use-case.provider';
import { REPO_PROVIDER } from './repos/repo.provider';
import { PassportModule } from '@nestjs/passport';
@Global()
@Module({
  imports: [PrismaModule,JwtModule],
  providers: [AuthService,JwtStrategy,...UseCaseProvider,...REPO_PROVIDER],
  controllers:[AuthController],
  exports: [AuthService],
})
export class AuthModule {}
