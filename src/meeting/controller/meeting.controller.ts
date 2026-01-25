import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/decorator';
import { GoogleCalendarClientService } from 'src/calendar/services/getGoogleCalendarClient.service';

@Controller('meeting')
export class MeetingController {
    constructor(private GoogleCalendarClientService:GoogleCalendarClientService) {}
    @UseGuards(AuthGuard('jwt'))
    @Post('/create')
    async createMeeting(@CurrentUser()user){
        const userId=user.id;
        
    }

}
