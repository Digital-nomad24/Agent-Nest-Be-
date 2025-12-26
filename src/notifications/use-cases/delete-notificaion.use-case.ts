import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class deleteNotificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, notificationId: string) {
    const deleted = await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Notification not found or unauthorized');
    }

    return { success: true };
  }
}
