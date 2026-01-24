import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { CalendarModule } from 'src/calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [MeetingController],
  providers: [MeetingService]
})
export class MeetingModule {}
