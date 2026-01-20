import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "prisma/prisma.service";
import { ReminderPublisherService } from "../pub-sub";

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);
  private processedNotifications = new Set<string>(); // In-memory cache

  constructor(
    private readonly prisma: PrismaService,
    private readonly publishReminder: ReminderPublisherService,
  ) {}

  @Cron('*/5 * * * *')
  async handleReminders() {
    this.logger.log('CRON JOB RUNNING');
    const now = new Date();

    try {
      const dueTasks = await this.prisma.task.findMany({
        where: {
          status: 'pending',
          dueDate: {
            lte: now,
          },
        },
        include: {
          user: true,
        },
        take: 50,
      });

      if (!dueTasks.length) {
        this.logger.log('No due tasks found');
        return;
      }

      this.logger.log(`Processing ${dueTasks.length} due tasks`);

      const results = await Promise.allSettled(
        dueTasks.map(task => this.processTask(task))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.log(
        `Processed ${successful} tasks successfully, ${failed} failed`
      );
    } catch (error) {
      this.logger.error('Error in reminder cron job', error);
    }
  }

  private async processTask(task: any) {
    try {
      // Find or create notification
      let notification = await this.prisma.notification.findFirst({
        where: {
          taskId: task.id,
          userId: task.userId,
        },
      });

      // Skip if already read
      if (notification?.isRead) {
        this.logger.debug(
          `Notification already read for task ${task.id}, skipping`
        );
        return;
      }

      // Create notification if it doesn't exist
      if (!notification) {
        notification = await this.prisma.notification.create({
          data: {
            message: `Reminder: ${task.title}`,
            type: 'default',
            dueDate: task.dueDate!,
            userId: task.userId,
            taskId: task.id,
            isRead: false,
          },
        });
        this.logger.log(`Created new notification for task ${task.id}`);
      } else {
        // Check if we already processed this notification in this run
        const cacheKey = `${notification.id}`;
        if (this.processedNotifications.has(cacheKey)) {
          this.logger.debug(
            `Notification ${notification.id} already processed in this run`
          );
          return;
        }
        this.processedNotifications.add(cacheKey);
      }

      const payload = await this.publishReminder.createReminderPayloadFromNotification(
        notification,
        task,
      );

      await this.publishReminder.publish(payload);

      this.logger.log(`Reminder sent for task ${task.id}`);
    } catch (error) {
      this.logger.error(`Error processing task ${task.id}`, error);
      throw error;
    }
  }

  // Clear cache periodically to prevent memory leaks
  @Cron('0 * * * *') // Every hour
  clearProcessedCache() {
    this.processedNotifications.clear();
    this.logger.log('Cleared processed notifications cache');
  }
}