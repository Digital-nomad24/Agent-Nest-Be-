import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { taskExtractPrompt } from "src/libs/prompts";
import { CreateTaskDto, TaskStatus } from "src/tasks/controllers/dto/tasks";
import { TelegramService, TaskExtractionService } from "../services";
import { createTaskUseCase } from "src/tasks/use-cases/create-tasks.use-case";
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
    this.logger.log("Telegram Webhook Triggered")
    const message = payload?.message;
    if (!message?.text || !message?.chat?.id) return;

    const chatId = String(message.chat.id);
    const fullText = message.text.trim();
    const command = fullText.split(' ')[0].toLowerCase();

    await this.telegramService.sendTelegramMessage(
      chatId,
      `🤖 I received: "${fullText}"`,
    );

    switch (command) {
      case '/help':
        await this.handleHelp(chatId);
        return;

      case '/remind':
        await this.handleRemind(chatId, fullText);
        return;

      default:
        return;
    }
  }

  // ================= HELP =================

  private async handleHelp(chatId: string) {
    await this.telegramService.sendTelegramMessage(
      chatId,
      '🛠️ **Help Menu**\n\n' +
        '• `/remind <message>`\n' +
        '  _Example:_ `/remind Call mom tomorrow`\n\n' +
        '• `/help`\n' +
        '  Show this help menu.',
    );
  }

  // ================= REMIND =================

  private async handleRemind(chatId: string, fullText: string) {
    // 1️⃣ Auth check
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

    // 2️⃣ Extract reminder text
    const reminderText = fullText.replace(/^\/remind\s+/i, '').trim();

    if (!reminderText) {
      await this.telegramService.sendTelegramMessage(
        chatId,
        '⚠️ Example: `/remind Call mom tomorrow at 8pm`',
      );
      return;
    }

    // 3️⃣ AI extraction
    const extractedTask =
      await this.taskExtractionService.extractTask(
        reminderText,
        taskExtractPrompt,
      );
    console.log(extractedTask?.dueDate)
    if (!extractedTask) {
      await this.telegramService.sendTelegramMessage(
        chatId,
        '🤖 Could not understand your reminder. Try rephrasing.',
      );
      return;
    }

    const createTaskDto: CreateTaskDto = {
  title: extractedTask.title,
  description: extractedTask.description,
  status:
    extractedTask.status === 'pending'
      ? TaskStatus.PENDING
      : TaskStatus.COMPLETED,
  priority: extractedTask.priority,
  dueDate: extractedTask.dueDate,
};


    await this.createTaskUseCase.execute(user.id, createTaskDto);

    await this.telegramService.sendTelegramMessage(
      chatId,
      `✅ **Reminder Set!**\n\n📝 ${extractedTask.title}`,
    );
  }
}
