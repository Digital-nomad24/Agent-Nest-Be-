import { Module } from '@nestjs/common';

import { SERVICE_PROVIDER } from './services/services.provider';
import { telegramController } from './controllers/telegram.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';
import { AiCompletionsModule } from 'src/ai-completions/ai-completions.module';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports:[AiCompletionsModule,TasksModule],
  controllers:[telegramController],
  providers: [...SERVICE_PROVIDER,...USE_CASE_PROVIDER]
})
export class TelegramModule {}
