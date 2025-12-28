// src/telegram/telegram.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';

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

  async getTelegramChatIdForUser(userId: string) {
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
      let text: string;

  if (typeof message === "string") {
    text = message;
  } else {
    text = JSON.stringify(message, null, 2);
  }
    try {
      await axios.post(url, {
        chat_id: chatId,
        text: message,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message to chatId=${chatId}`,
        error,
      );
      throw error;
    }
  }
}
