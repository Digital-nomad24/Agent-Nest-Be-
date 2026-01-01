import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateEventDto } from '../controllers/dtos/create-event.input';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarClientService } from '../services/getGoogleCalendarClient.service';

@Injectable()
export class CreateCalendarEventUseCase {
  private readonly logger = new Logger(CreateCalendarEventUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarClientService: GoogleCalendarClientService,
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

      // Validate times
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid start or end time');
      }

      if (end <= start) {
        throw new BadRequestException('End time must be after start time');
      }

      // Get calendar client (handles token refresh)
      const calendar = await this.googleCalendarClientService.getGoogleCalendarClient(userId);

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

      if (!googleEvent.id) {
        throw new Error('Failed to create event in Google Calendar');
      }

      const duration =
        (end.getTime() - start.getTime()) / (1000 * 60);

      const meeting = await this.prisma.meeting.create({
        data: {
          title,
          description,
          startTime: start,
          endTime: end,
          duration,
          groupId,
          organizerId: userId,
          location,
          meetingLink: googleEvent?.hangoutLink || null,
          googleEventId: googleEvent.id,
          status: 'confirmed',
        },
      });

      this.logger.log(`Event created successfully for user ${userId}: ${googleEvent.id}`);

      return {
        message: 'Meeting created and pushed to Google Calendar',
        eventId: googleEvent.id,
        meeting,
        eventHtmlLink: googleEvent.htmlLink,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating calendar event:', error);
      throw new BadRequestException('Failed to create calendar event');
    }
  }
}