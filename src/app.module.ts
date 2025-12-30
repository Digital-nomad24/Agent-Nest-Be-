import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupModule } from './group/group.module';
import { PubsubModule } from './infra/pubsub/pubsub.module';
import { TelegramModule } from './infra/telegram/telegram.module';
import { AiCompletionsModule } from './ai-completions/ai-completions.module';
import { GoogleModule } from './google/google.module';
import { HealthModule } from './health/health.module';
import { CalendarModule } from './calendar/calendar.module';
import { MeetingModule } from './meeting/meeting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    TasksModule,
    NotificationsModule,
    GroupModule,
    PubsubModule,
    TelegramModule,
    AiCompletionsModule,
    GoogleModule,
    HealthModule,
    CalendarModule,
    MeetingModule,
  ],
  providers: [],
})
export class AppModule {}
