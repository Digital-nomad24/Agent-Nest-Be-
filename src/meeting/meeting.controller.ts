import { Controller, Get, Post } from '@nestjs/common';
import { GoogleCalendarClientService } from 'src/calendar/services/getGoogleCalendarClient.service';
@Controller('meeting')
export class MeetingController 
{
    constructor(private readonly GoogleCalendarClientService: GoogleCalendarClientService) {}

    @Post('bookMeeting')
    async bookMeeting(){
        
    }
}

