import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TaskExtractionService } from './telegram-task-extraction.service';

@Module({
  providers: [TelegramService,TaskExtractionService]
})
export class TelegramModule {}
