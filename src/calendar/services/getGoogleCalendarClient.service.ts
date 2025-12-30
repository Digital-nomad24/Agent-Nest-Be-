import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { GoogleCalendarService } from "src/google/services/google-calendar.service";
@Injectable()
export class GoogleCalendarClientService{
    access_token: string;

    constructor(private readonly configService:ConfigService,
                private readonly GoogleCalendarService:GoogleCalendarService
    ){}
    async getGoogleCalendarClient(userId:string){
        const access_token=await this.GoogleCalendarService.getValidAccessToken(userId)
        const oauth2Client = new google.auth.OAuth2(
    this.configService.get<string>('GOOGLE_CLIENT_ID'),
    this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    this.configService.get<string>('GOOGLE_REDIRECT_URI'),
  );

  oauth2Client.setCredentials({
    access_token: access_token,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
    }
}