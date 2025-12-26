import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { UserController } from './controllers/user.controller';
import { REPO_PROVIDER } from '../auth/repos/repo.provider';
import { AuthModule } from 'src/auth/auth.module';
@Module({
    imports: [PrismaModule,AuthModule],
    controllers: [UserController],
    providers: [...REPO_PROVIDER],
})
export class UserModule {}
