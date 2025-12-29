import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from 'prisma/src/generated/prisma/client';
import { FetchTasksQueryDto } from 'src/tasks/controllers/dto/tasks';

@Injectable()
export class listTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    return this.prisma.task.findMany({
      where:{userId:userId},
      orderBy: [
        { status: 'asc' },
        { priorityOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        priorityOrder: true,
        dueDate: true,
        completionDate: true,
        createdAt: true,
      },
    });
  }
}
