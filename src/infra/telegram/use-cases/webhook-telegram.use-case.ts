// use-cases/telegram-task-webhook.usecase.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { TelegramService } from '../telegram.service';
import { createTaskUseCase } from 'src/tasks/use-cases/create-tasks.use-case';
import { TaskExtractionService } from '../telegram-task-extraction.service';
import { taskExtractPrompt } from 'src/libs/prompts';
import { CreateTaskDto, TaskPriority, TaskStatus } from 'src/tasks/controllers/dto/tasks';

@Injectable()
export class TelegramTaskWebhookUseCase {
  private readonly logger = new Logger(TelegramTaskWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly taskExtractionService: TaskExtractionService,
    private readonly createTaskUseCase: createTaskUseCase,
  ) {}

  async execute(payload: any): Promise<void> {
    const message = payload?.message;

    if (!message?.text || !message?.chat?.id) {
      this.logger.debug('Ignoring non-text message');
      return;
    }

    const chatId = String(message.chat.id);
    const fullText = message.text.trim();
    const command = fullText.split(' ')[0].toLowerCase();

    // Echo test (optional)
    await this.telegramService.sendTelegramMessage(
      chatId,
      `🤖 I received: "${fullText}"`,
    );

    if (command !== '/remind') {
      return;
    }

    await this.handleRemindCommand(chatId, fullText);
  }

  private async handleRemindCommand(chatId: string, fullText: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { id: true },
    });

    if (!user) {
      await this.telegramService.sendTelegramMessage(
        chatId,
        '🔐 Please connect your account first using `/start`.',
      );
      return;
    }

    const reminderText = fullText.replace(/^\/remind\s+/i, '').trim();

    if (!reminderText) {
      await this.telegramService.sendTelegramMessage(
        chatId,
        '⚠️ Example: `/remind Call mom tomorrow at 8pm`',
      );
      return;
    }

    // 1️⃣ Extract task using AI
    const extractedTask =
      await this.taskExtractionService.extractTask(reminderText,taskExtractPrompt);

    if (!extractedTask) {
      await this.telegramService.sendTelegramMessage(
        chatId,
        '🤖 Could not understand your reminder. Try rephrasing.',
      );
      return;
    }

    // 2️⃣ Create task via API
    const createTaskDto: CreateTaskDto = {
  title: extractedTask.title,
  description: extractedTask.description,
  status:
    extractedTask.status == 'pending'
      ? TaskStatus.PENDING
      : TaskStatus.COMPLETED,
  priority:
    extractedTask.priority == 'high'
      ? TaskPriority.HIGH
      : extractedTask.priority == 'medium'
      ? TaskPriority.MEDIUM
      : TaskPriority.LOW,
  dueDate: extractedTask.dueDate
    ? new Date(extractedTask.dueDate)
    : undefined,
};

await this.createTaskUseCase.execute(user.id, createTaskDto);

    // 3️⃣ Confirm to user
    await this.telegramService.sendTelegramMessage(
      chatId,
      `✅ Reminder set!\n\n📝 ${extractedTask.title}`,
    );
  }
}
