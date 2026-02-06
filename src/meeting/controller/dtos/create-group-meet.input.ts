import { IsISO8601, IsObject, IsString } from "class-validator";

export class groupMeetDto {
    @IsString()
    title:string

    @IsString()
    description:string

    @IsString()
    location:string

    @IsString()
    @IsISO8601()
    startTime:string  

    @IsString()
    @IsISO8601()
    endTime:string

    @IsString()
    groupId:string

    @IsObject()
    attendeeIds:string
}