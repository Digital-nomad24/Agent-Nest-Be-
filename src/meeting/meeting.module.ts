import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.controller';
import { CalendarModule } from 'src/calendar/calendar.module';
import { MeetingService } from './meeting.service';

@Module({
  imports: [CalendarModule],
  controllers: [MeetingController],
  providers: [MeetingService]
})
export class MeetingModule {}