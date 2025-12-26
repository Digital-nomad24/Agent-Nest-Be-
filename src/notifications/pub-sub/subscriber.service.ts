import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Subscription } from '@google-cloud/pubsub';
import { PubSubClient } from 'src/infra/pubsub/pubsub.client';
import { ReminderPayload } from './publisher.service';
import { NotificationsGateway } from '../sockets/notification.gateway';


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
    try {
      const data: ReminderPayload = JSON.parse(message.data.toString());

      const deliveredViaSocket =
        this.gateway.emitToUser(data.userId, {
          message: `⏰ Reminder: "${data.title}" is due!`,
          type: data.priority === 'high' ? 'critical' : 'default',
          dueDate: data.dueTime,
          taskId: data.taskId,
        });
        console.log("MESSAGE RECEIVED")

      // if (!deliveredViaSocket) {
      //   await this.telegramService.sendReminder(
      //     data.userId,
      //     data.title,
      //     data.dueTime,
      //   );
      // }

      message.ack();
    } catch (err) {
      this.logger.error('Error processing reminder', err);
      message.nack();
    }
  }

  onModuleDestroy() {
    this.subscription?.removeAllListeners();
    this.subscription?.close();
    this.logger.warn('Reminder subscriber stopped');
  }
}
