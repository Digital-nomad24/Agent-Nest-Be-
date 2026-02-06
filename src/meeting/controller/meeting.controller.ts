import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/decorator';
import { groupMeetDto } from './dtos/create-group-meet.input';
import { CreateGroupMeetingUseCase } from '../use-cases/create-group-meeting.use-case';

@Controller('meeting')
export class MeetingController {
    constructor(private CreateGroupMeetingUseCase:CreateGroupMeetingUseCase
    ) {}
    @UseGuards(AuthGuard('jwt'))
    @Post('/group-create')
    async createMeeting(@CurrentUser()user,@Body()dto:groupMeetDto){
        return await this.CreateGroupMeetingUseCase.execute(user.id,dto)
    }

}
