import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "prisma/prisma.service";
import { ReminderPublisherService } from "../pub-sub";

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publishReminder: ReminderPublisherService,
  ) {}

  @Cron('* * * * *')
  async handleReminders() {
    this.logger.log('CRON JOB RUNNING');

    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    try {
      const dueTasks = await this.prisma.task.findMany({
        where: {
          status: 'pending',
          dueDate: {
            gte: oneMinuteAgo,
            lte: fiveMinutesLater,
          },
        },
        include: {
          user: true,
        },
      });

      for (const task of dueTasks) {
        let notification = await this.prisma.notification.findFirst({
          where: {
            taskId: task.id,
            userId: task.userId,
          },
        });

        // 🔹 If notification exists and is READ → skip
        if (notification?.isRead) {
          this.logger.debug(
            `Notification already read for task ${task.id}, skipping`,
          );
          continue;
        }

        // 🔹 If notification does NOT exist → create ONE
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
        }

        // 🔹 Send reminder (whether notification was just created or already existed as unread)
        const payload =
          await this.publishReminder.createReminderPayloadFromNotification(
            notification,
            task,
          );

        await this.publishReminder.publish(payload);

        this.logger.log(`Reminder sent for task ${task.id}`);
      }
    } catch (error) {
      this.logger.error('Error in reminder cron job', error);
    }
  }
}