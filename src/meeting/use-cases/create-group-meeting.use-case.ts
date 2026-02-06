import { PrismaService } from "prisma/prisma.service";
import { groupMeetDto } from "../controller/dtos/create-group-meet.input";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { GoogleCalendarClientService } from "src/calendar/services/getGoogleCalendarClient.service";



export class CreateGroupMeetingUseCase{
    constructor(private prisma:PrismaService,
        private GoogleCalendarClientService:GoogleCalendarClientService,
    ){}
    async execute(userId:string,body:groupMeetDto){
        const {
      groupId,
      title,
      description,
      startTime,
      endTime,
      location,
      attendeeIds 
    } = body;
        const isMember=await this.prisma.groupMembership.findUnique({
            where:{userId_groupId:{userId,groupId}}
        })
        if(!isMember){
            return new ForbiddenException('forbidden not a group member')
        }
        const meeting=await this.prisma.meeting.create({
            data:{
                title,
                description,
                location,
                startTime:new Date(startTime),
                endTime:new Date(endTime),
                duration:Math.floor((new Date(endTime).getTime()-new Date(startTime).getTime())/60000),
                groupId,
            organizerId:userId,
                        }
        })
    }
}