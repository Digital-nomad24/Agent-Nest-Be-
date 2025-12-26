export enum NotificationType {
  DEFAULT = 'default',
  CRITICAL = 'critical',
}
import {
    IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.DEFAULT;

  @IsNotEmpty()
  @IsISO8601()
  dueDate: string; 

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
