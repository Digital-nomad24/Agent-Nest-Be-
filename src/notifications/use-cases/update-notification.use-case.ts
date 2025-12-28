import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateNotificationDto } from '../controllers/dtos/notification.input';

@Injectable()
export class UpdateNotificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    notificationId: string,
    dto: UpdateNotificationDto,
  ) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data:
      {isRead: true},
    });

    if (updated.count === 0) {
      throw new NotFoundException('Notification not found or unauthorized');
    }

    return { success: true };
  }
}
