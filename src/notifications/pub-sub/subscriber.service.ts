import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Subscription, Message } from '@google-cloud/pubsub';
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
    private readonly telegramService: TelegramService,
  ) {}

  onModuleInit() {
    this.subscription = this.pubsub.client.subscription(this.subscriptionName);

    this.subscription.on('message', (message: Message) =>
      this.handleMessage(message),
    );

    this.subscription.on('error', (err) =>
      this.logger.error('Subscription error', err),
    );

    this.logger.log('Reminder subscriber started');
  }

  async handleMessage(message: Message) {
    let data: ReminderPayload;

    try {
      data = JSON.parse(message.data.toString()) as ReminderPayload;
    } catch (err) {
      this.logger.error('Invalid reminder payload', err);
      message.ack();
      return;
    }

    /* ---------- SOCKET NOTIFICATION ---------- */
    this.gateway.emitToUser(data.userId, {
      message: `⏰ Reminder: "${data.title}" is due!`,
      type: data.priority === 'high' ? 'critical' : 'default',
      dueDate: data.dueDate,
      taskId: data.taskId,
    });

    /* ---------- TELEGRAM NOTIFICATION ---------- */
    const chatId = await this.telegramService.getTelegramChatIdForUser(
      data.userId,
    );

    if (!chatId) {
      this.logger.warn(
        `No Telegram chatId found for user ${data.userId}`,
      );
      message.ack();
      return;
    }
    const newData=await this.telegramService.formatTaskNotification(data)
    await this.telegramService.sendTelegramMessage(
      chatId,newData
    );

    message.ack();
    this.logger.log(`Reminder processed for task ${data.taskId}`);
  }

  onModuleDestroy() {
    this.subscription?.removeAllListeners();
    this.subscription?.close();
    this.logger.warn('Reminder subscriber stopped');
  }
}
