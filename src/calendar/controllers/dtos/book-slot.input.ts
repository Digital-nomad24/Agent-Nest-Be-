import { IsDateString, IsNotEmpty } from 'class-validator';

export class BookSlotDto {
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}