import { Module } from '@nestjs/common';
import { MeetingController } from './controller/meeting.controller';
import { CalendarModule } from 'src/calendar/calendar.module';
import { MeetingService } from './meeting.service';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';

@Module({
  imports: [CalendarModule],
  controllers: [MeetingController],
  providers: [MeetingService,...USE_CASE_PROVIDER]
})
export class MeetingModule {}