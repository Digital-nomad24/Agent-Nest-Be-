import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarClientService } from '../services/getGoogleCalendarClient.service';

@Injectable()
export class CalendarSyncUseCase {
  private readonly logger = new Logger(CalendarSyncUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarClientService: GoogleCalendarClientService,
  ) {}

  /**
   * Syncs the current month's calendar events from Google Calendar
   */
  async syncCurrentMonth(userId: string) {
    try {
      // Get calendar client (handles token refresh)
      const calendar = await this.googleCalendarClientService.getGoogleCalendarClient(userId);
      
      const { start, end } = this.getCurrentMonthRange();

      this.logger.log(
        `Syncing calendar for user ${userId} from ${start.toISOString()} to ${end.toISOString()}`,
      );

      // Fetch events from Google Calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
      });

      const events = response.data.items || [];
      this.logger.log(`Fetched ${events.length} events from Google Calendar`);

      // Delete existing events in this range
      await this.prisma.calendarEvent.deleteMany({
        where: {
          userId,
          startTime: {
            gte: start,
            lte: end,
          },
        },
      });

      // Create new events
      let syncedCount = 0;
      let skippedCount = 0;

      for (const event of events) {
        if (event.start && event.end) {
          try {
            // Handle both dateTime and date (all-day events)
            const startTime = event.start.dateTime 
              ? new Date(event.start.dateTime) 
              : new Date(event.start.date!);
            
            const endTime = event.end.dateTime 
              ? new Date(event.end.dateTime) 
              : new Date(event.end.date!);

            await this.prisma.calendarEvent.create({
              data: {
                userId,
                title: event.summary || 'Untitled Event',
                description: event.description || null,
                startTime,
                endTime,
                isAllDay: !event.start.dateTime,
                googleEventId: event.id || null,
                status:
                  event.status === 'confirmed'
                    ? 'confirmed'
                    : event.status === 'tentative'
                    ? 'tentative'
                    : 'cancelled',
              },
            });
            syncedCount++;
          } catch (error) {
            this.logger.error(`Error creating calendar event ${event.id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      // Update user's last sync time
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastCalendarSync: new Date() },
      });

      this.logger.log(`Sync completed: ${syncedCount} synced, ${skippedCount} skipped`);

      return {
        message: 'Calendar synced successfully for current month',
        period: `${start.toDateString()} to ${end.toDateString()}`,
        totalFetched: events.length,
        syncedCount,
        skippedCount,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Calendar sync error:', error);
      throw new InternalServerErrorException('Failed to sync calendar');
    }
  }

  private getCurrentMonthRange() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return {
      start: startOfMonth,
      end: endOfMonth,
    };
  }
}