import { Module } from '@nestjs/common';
import { AiCompletionsController } from './controllers/ai-completions.controller';
import { SERVICE_PROVIDER } from './services/service.provider';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports:[TasksModule],
  controllers: [AiCompletionsController],
  providers: [...SERVICE_PROVIDER],
  exports:[...SERVICE_PROVIDER]
})
export class AiCompletionsModule {}
