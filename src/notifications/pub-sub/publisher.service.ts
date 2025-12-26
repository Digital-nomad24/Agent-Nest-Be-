import { Injectable, Logger } from '@nestjs/common';
import { TaskPriority } from 'prisma/src/generated/prisma/enums';
import { PubSubClient } from 'src/infra/pubsub/pubsub.client';
import { Notification } from 'prisma/src/generated/prisma/client';

export type ReminderPayload = {
  notificationId: string;
  userId: string;
  taskId: string;
  title: string;
  dueTime: string; // ISO
  priority: TaskPriority;
};

export type TaskWithUser = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  priorityOrder: number;
  dueDate: Date | null;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

@Injectable()
export class ReminderPublisherService {
    constructor(private readonly pubsub:PubSubClient){

    }
  private readonly logger = new Logger(ReminderPublisherService.name);
  private readonly topicName = 'task-notifications';

  async publish(payload: ReminderPayload) {
    const buffer = Buffer.from(JSON.stringify(payload));

    const messageId = await this.pubsub.client.topic(this.topicName).publish(buffer);

    this.logger.log(
      `Reminder published (${messageId}) for task: ${payload.title}`,
    );

    return messageId;
  }
  async createReminderPayloadFromNotification(notification: Notification,
  task: TaskWithUser
){
  console.log("REMINDER NOW INTO PUBLISHING MODE")
    return {
    notificationId: notification.id,
    userId: task.userId,
    taskId: task.id,
    title: task.title,
    dueTime: task.dueDate?.toISOString() || new Date().toISOString(),
    priority: task.priority,
  };
}
}
