import { Module } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-cases.provider';
import { SERVICE_PROVIDER } from './services/services.provider';
import { GoogleModule } from 'src/google/google.module';
import { GoogleCalendarClientService } from './services/getGoogleCalendarClient.service';

@Module({
  imports:[GoogleModule],
  controllers: [CalendarController],
  exports:[GoogleCalendarClientService],
  providers: [...SERVICE_PROVIDER,...USE_CASE_PROVIDER,],
  
  
})
export class CalendarModule {}