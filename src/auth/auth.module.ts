import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { JwtStrategy } from './strategy';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthController } from './controllers/auth.controller';
import { UseCaseProvider } from './use-cases/use-case.provider';
import { REPO_PROVIDER } from './repos/repo.provider';
@Global()
@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET}),PrismaModule],
  providers: [AuthService,JwtStrategy,...UseCaseProvider,...REPO_PROVIDER],
  controllers:[AuthController],
  exports: [AuthService],
})
export class AuthModule {}
