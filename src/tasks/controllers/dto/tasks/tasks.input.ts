import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';


export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.PENDING;

  @IsEnum(TaskPriority)
  priority: TaskPriority = TaskPriority.MEDIUM;

  @IsNotEmpty()
  @IsString()
  dueDate: string; 

  @IsOptional()
  @IsString()
  description?: string;
}


export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class FetchTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  search?: string;
}
