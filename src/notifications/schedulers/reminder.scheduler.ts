import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { ReminderPublisherService } from '../pub-sub/publisher.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publishReminder: ReminderPublisherService,
  ) {}

  // runs every minute
  @Cron('* * * * *')
  async handleReminders() {
    this.logger.log('CRON JOB RUNNING');

  const now = new Date();
  const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    try {
      console.log("THIS IS THE PRISMA RUNNING TO CHECK THE NOTIFICATIONS")
      const dueTasks = await this.prisma.task.findMany({
        where: {
          dueDate: {
            gte: oneMinuteAgo,
            lte: fiveMinutesLater,
          },
          status: 'pending',
          NOT: {
            dueDate: null,
          },
        },
        include: {
          user: true,
        },
      });
      console.log(dueTasks)
      for (const task of dueTasks) {
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            taskId: task.id,
            userId: task.userId,
          },
        });

        if (existingNotification?.isRead && existingNotification?.dueDate>existingNotification?.createdAt) {
          this.logger.debug(`Notification already exists for task: ${task.id}`);
          continue;
        }

        const notification = await this.prisma.notification.create({
          data: {
            message: `Reminder: ${task.title}`,
            type: 'default',
            dueDate: task.dueDate!,
            userId: task.userId,
            taskId: task.id,
          },
        });
        console.log("REMINDER RUNNING")
        const payload = await this.publishReminder.createReminderPayloadFromNotification(notification, task);
        await this.publishReminder.publish(payload);

        this.logger.log(`Published reminder for task: ${task.id}`);
      }

      if (dueTasks.length > 0) {
        this.logger.log(`Processed ${dueTasks.length} due tasks`);
      }
    } catch (error) {
      this.logger.error('Error in reminder cron job', error);
    }
  }
}
