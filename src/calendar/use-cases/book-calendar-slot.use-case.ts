import {
  Injectable,
  Logger,
  BadRequestException,
  GoneException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarClientService } from '../services/getGoogleCalendarClient.service';
import { BookSlotDto } from '../controllers/dtos/book-slot.input';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class CalendarBookingUseCase {
  private readonly logger = new Logger(CalendarBookingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarClientService: GoogleCalendarClientService,
  ) {}

  /**
   * Books a time slot through a shared calendar link
   */
  async bookSlot(userId: string, token: string, dto: BookSlotDto) {
    try {
      const { startTime, endTime } = dto;

      // Get visitor information
      const visitor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
        },
      });

      if (!visitor) {
        throw new NotFoundException('Authenticated user not found');
      }

      const visitorName = visitor.name || 'Guest';
      const visitorEmail = visitor.email;

      // Validate and parse times
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);

      if (
        isNaN(parsedStartTime.getTime()) ||
        isNaN(parsedEndTime.getTime())
      ) {
        throw new BadRequestException('Invalid start or end time');
      }

      if (parsedEndTime <= parsedStartTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Get share link with owner info
      const shareLink = await this.prisma.calendarShareLink.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!shareLink) {
        throw new NotFoundException('Share link not found');
      }

      if (new Date() > shareLink.expiresAt || !shareLink.isActive) {
        throw new GoneException('Link expired or inactive');
      }

      const user = shareLink.user;

      if (!user.googleRefreshToken) {
        throw new UnauthorizedException(
          'Calendar owner not connected to Google Calendar',
        );
      }

      // Validate booking is within available period
      const {
        availableStart,
        availableEnd,
        earliestHour,
        latestHour,
        allowWeekends,
        timezone: linkTimezone,
        slotDuration,
      } = shareLink;

      if (
        parsedStartTime < availableStart ||
        parsedEndTime > availableEnd
      ) {
        throw new BadRequestException(
          'Booking is outside the available period',
        );
      }

      // Validate booking hours and day
      const start = dayjs(parsedStartTime).tz(linkTimezone);
      const end = dayjs(parsedEndTime).tz(linkTimezone);
      const bookingStartHour = start.hour();
      const bookingEndHour = end.hour();
      const bookingDay = start.day();

      if (
        bookingStartHour < earliestHour ||
        bookingEndHour > latestHour
      ) {
        throw new BadRequestException(
          `Booking must be between ${earliestHour}:00 and ${latestHour}:00`,
        );
      }

      if (!allowWeekends && [0, 6].includes(bookingDay)) {
        throw new BadRequestException(
          'Weekend bookings are not allowed',
        );
      }

      // Validate slot duration
      const actualSlotDuration = Math.floor(
        (parsedEndTime.getTime() - parsedStartTime.getTime()) / (60 * 1000),
      );

      if (actualSlotDuration !== slotDuration) {
        throw new BadRequestException(
          `Booking must be exactly ${slotDuration} minutes long`,
        );
      }

      // Get Google Calendar client (handles token refresh)
      const calendar = await this.googleCalendarClientService.getGoogleCalendarClient(
        user.id,
      );

      // Check availability (FreeBusy)
      const freeBusyRes = await calendar.freebusy.query({
        requestBody: {
          timeMin: parsedStartTime.toISOString(),
          timeMax: parsedEndTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busy = freeBusyRes.data.calendars?.primary?.busy || [];

      const isSlotBusy = busy.some(
        (slot) =>
          new Date(slot.start || '') < parsedEndTime &&
          parsedStartTime < new Date(slot.end || ''),
      );

      if (isSlotBusy) {
        throw new ConflictException(
          'Time slot already booked. Please choose another',
        );
      }

      // Create event in Google Calendar
      const eventRes = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'all',
        requestBody: {
          summary: 'Appointment',
          description: `Meeting booked by ${visitorName} (${visitorEmail}) via share link.`,
          start: {
            dateTime: parsedStartTime.toISOString(),
            timeZone: linkTimezone,
          },
          end: {
            dateTime: parsedEndTime.toISOString(),
            timeZone: linkTimezone,
          },
          attendees: [
            {
              email: visitorEmail,
              displayName: visitorName,
            },
          ],
        },
      });

      this.logger.log(`Booking successful for user ${userId} with token ${token}`);

      return {
        message: 'Meeting booked successfully!',
        eventId: eventRes.data.id,
        eventLink: eventRes.data.htmlLink,
        calendarResponse: eventRes.data,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof GoneException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Booking failed:', error);
      throw new BadRequestException('Failed to book time slot');
    }
  }
}