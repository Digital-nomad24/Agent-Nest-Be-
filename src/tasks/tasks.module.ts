import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';
import { TaskController } from './controllers/tasks.controller';

@Module({
  providers: [TasksService,...USE_CASE_PROVIDER],
  controllers: [TaskController]
})
export class TasksModule {}
