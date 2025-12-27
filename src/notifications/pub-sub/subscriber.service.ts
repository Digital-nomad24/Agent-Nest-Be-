import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { Subscription } from '@google-cloud/pubsub';
import { PubSubClient } from 'src/infra/pubsub/pubsub.client';
import { ReminderPayload } from './publisher.service';
import { NotificationsGateway } from '../sockets/notification.gateway';
import { TelegramService } from 'src/infra/telegram/services';


@Injectable()
export class ReminderSubscriberService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ReminderSubscriberService.name);
  private subscription!: Subscription;

  private readonly subscriptionName = 'task-notifications-sub';

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly pubsub: PubSubClient,
    private readonly telegramService:TelegramService
  ) {}

  onModuleInit() {
    this.subscription = this.pubsub.client.subscription(this.subscriptionName);
    this.subscription.on('message', this.handleMessage.bind(this));
    this.subscription.on('error', (err) =>
      this.logger.error('Subscription error', err),
    );

    this.logger.log('Reminder subscriber started');
  }

  async handleMessage(message: any) {
   
      const data: ReminderPayload = JSON.parse(message.data.toString());

      const deliveredViaSocket =
        this.gateway.emitToUser(data.userId, {
          message: `⏰ Reminder: "${data.title}" is due!`,
          type: data.priority === 'high' ? 'critical' : 'default',
          dueDate: data.dueTime,
          taskId: data.taskId,
        });
        console.log("MESSAGE RECEIVED")

        const chatId=await this.telegramService.getTelegramChatIdForUser(
          data.userId,
        );
        if(!chatId){
          return new BadRequestException('Telegram Chat Id does not exist')
        }
        console.log(String(message.data))
        await this.telegramService.sendTelegramMessage(chatId,String(message.data))

      message.ack();
  }

  onModuleDestroy() {
    this.subscription?.removeAllListeners();
    this.subscription?.close();
    this.logger.warn('Reminder subscriber stopped');
  }
}
