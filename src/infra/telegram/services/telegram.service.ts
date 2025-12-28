// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';

type TaskPriority = 'high' | 'medium' | 'low';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
  }

  async getTelegramChatIdForUser(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user) {
      this.logger.warn(`User not found for userId=${userId}`);
      return null;
    }

    if (!user.telegramChatId) {
      this.logger.warn(`Telegram not connected for userId=${userId}`);
      return null;
    }

    return user.telegramChatId;
  }

  async sendTelegramMessage(
    chatId: string,
    message: string,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const text =
      typeof message === 'string'
        ? message
        : JSON.stringify(message, null, 2);

    try {
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message to chatId=${chatId}`,
        error,
      );
      throw error;
    }
  }

  formatTaskNotification(data: any): string {
    // ✅ Normalize & protect runtime values
    const title = data?.title ?? 'Untitled Task';
    const dueTime = data?.dueTime ?? new Date().toISOString();
    const priority = (data?.priority ?? 'low') as TaskPriority;

    const dueDate = new Date(dueTime);
    const formattedDate = dueDate.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const priorityEmoji: Record<TaskPriority, string> = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };

    return `
🔔 *Task Reminder*

📋 *Title:* ${title}
${priorityEmoji[priority]} *Priority:* ${priority.toUpperCase()}
⏰ *Due:* ${formattedDate}
`.trim();
  }
}
