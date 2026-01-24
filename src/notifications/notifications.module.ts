import { Module } from '@nestjs/common';
import { SERVICE_PROVIDER } from './service.provider';
import { NotificationsController } from './controllers/notifications.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';
import { ScheduleModule } from '@nestjs/schedule';
import { PubSubClient } from 'src/infra/pubsub/pubsub.client';
import { TelegramModule } from 'src/infra/telegram/telegram.module';

@Module({
  providers: [...USE_CASE_PROVIDER,PubSubClient,...SERVICE_PROVIDER],
  controllers: [NotificationsController],
  imports: [
    ScheduleModule.forRoot(),
    TelegramModule
  ],
})
export class NotificationsModule {}
