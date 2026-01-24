import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.controller';
import { CalendarModule } from 'src/calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [MeetingController],
  providers: []
})
export class MeetingModule {}