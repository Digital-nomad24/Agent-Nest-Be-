import { Module } from '@nestjs/common';
import { SERVICE_PROVIDER } from './service.provider';
import { NotificationsController } from './controllers/notifications.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';
import { ScheduleModule } from '@nestjs/schedule';
import { PubSubClient } from 'src/infra/pubsub/pubsub.client';
import { JwtService } from '@nestjs/jwt';
import { TelegramService } from 'src/infra/telegram/services';

@Module({
  providers: [...USE_CASE_PROVIDER,PubSubClient,...SERVICE_PROVIDER,JwtService,TelegramService],
  controllers: [NotificationsController],
  imports: [
    ScheduleModule.forRoot(),
  ],
})
export class NotificationsModule {}
