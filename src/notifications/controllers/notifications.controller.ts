import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/decorator';
import { deleteNotificationUseCase } from '../use-cases/delete-notificaion.use-case';
import { UpdateNotificationUseCase } from '../use-cases/update-notification.use-case';
import { UpdateNotificationDto } from './dtos/notification.input';
import { retrieveNotificationsUseCase } from '../use-cases/retrieve-notification.use-case';


@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getNotifications: retrieveNotificationsUseCase,
    private readonly updateNotification: UpdateNotificationUseCase,
    private readonly deleteNotification: deleteNotificationUseCase,
  ) {}

  @Get('getAll')
  getAll(@CurrentUser() user) {
    return this.getNotifications.execute(user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.updateNotification.execute(user.id, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user,
    @Param('id') id: string,
  ) {
    return this.deleteNotification.execute(user.id, id);
  }
}
