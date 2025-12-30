// dto/create-share-link.dto.ts
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateShareLinkDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  expiresInDays?: number = 2;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(60)
  availableDays?: number = 7;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  slotDuration?: number = 30;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  bufferBetween?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(23)
  earliestHour?: number = 9;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(23)
  latestHour?: number = 17;

  @IsString()
  @IsOptional()
  timezone?: string = 'UTC';

  @IsBoolean()
  @IsOptional()
  allowWeekends?: boolean = false;

  @IsBoolean()
  @IsOptional()
  allowBookingEdit?: boolean = true;
}