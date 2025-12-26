import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import { UpdateTaskDto } from 'src/tasks/controllers/dto/tasks';
import { getPriorityOrder } from './create-tasks.use-case';
import { Prisma } from 'prisma/src/generated/prisma/client';

@Injectable()
export class updateTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Prisma.TaskUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;

    if (dto.priority !== undefined) {
      updateData.priority = dto.priority;
      updateData.priorityOrder = getPriorityOrder(dto.priority);
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
      updateData.completionDate =
        dto.status === 'completed' ? new Date() : null;
    }

    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate;
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });
  }
}
