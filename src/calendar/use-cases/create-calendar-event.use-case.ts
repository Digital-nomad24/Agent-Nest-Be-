import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateEventDto } from '../controllers/dtos/create-event.input';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarClientService } from '../services/getGoogleCalendarClient.service';


@Injectable()
export class CreateCalendarEventUseCase {
  private readonly logger = new Logger(CreateCalendarEventUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly GoogleCalendarClientService: GoogleCalendarClientService,
  ) {}

  /**
   * Creates a meeting event and pushes it to Google Calendar
   */
  async createEvent(userId: string, createEventDto: CreateEventDto) {
    try {
      const {
        title,
        description,
        startTime,
        endTime,
        location,
        groupId,
        attendees,
        conference,
      } = createEventDto;

      const calendar = await this.GoogleCalendarClientService.getGoogleCalendarClient(userId);

      const eventData: any = {
        summary: title,
        description,
        start: { dateTime: startTime, timeZone: 'UTC' },
        end: { dateTime: endTime, timeZone: 'UTC' },
        location,
        attendees: attendees?.map((email: string) => ({ email })),
      };

      if (conference) {
        eventData.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const calendarRes = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
        conferenceDataVersion: conference ? 1 : undefined,
        sendUpdates: 'all',
      });

      const googleEvent = calendarRes.data;

      const duration =
        (new Date(endTime).getTime() - new Date(startTime).getTime()) /
        (1000 * 60);

      const meeting = await this.prisma.meeting.create({
        data: {
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration,
          groupId,
          organizerId: userId,
          location,
          meetingLink: googleEvent?.hangoutLink || null,
          googleEventId: googleEvent?.id || null,
          status: 'confirmed',
        },
      });

      return {
        message: 'Meeting created and pushed to Google Calendar',
        eventId: googleEvent.id,
        meeting,
        eventHtmlLink: googleEvent.htmlLink,
      };
    } catch (error) {
      this.logger.error('Error pushing meeting to calendar:', error);
      throw error;
    }
  }
}