// src/google/services/google-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleWebhookService {
  private readonly logger = new Logger(GoogleWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private googleCalendarService: GoogleCalendarService,
    private configService: ConfigService,
  ) {}

  async handleWebhook(
    channelId: string,
    resourceState: string,
    resourceId: string,
  ) {
    this.logger.log(`Webhook received: ${resourceState} for channel ${channelId}`);

    if (resourceState === 'sync') {
      return { message: 'Sync handshake received' };
    }

    const channel = await this.prisma.calendarChannel.findFirst({
      where: { channelId },
      include: { user: true },
    });

    if (!channel || !channel.user) {
      this.logger.warn(`Unknown channelId or user not found: ${channelId}`);
      return { message: 'Channel or user not found' };
    }

    const userId = channel.userId;

    try {
      const accessToken = await this.googleCalendarService.getValidAccessToken(userId);
      const clientUrl = process.env.CLIENT_URL
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GOOGLE_ID'),
        this.configService.get('GOOGLE_SECRET'),
        `${clientUrl}/google/calendar/callback`,
      );
      oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const now = new Date();
      const past = new Date(now.getTime() - 10 * 60 * 1000);

      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin: past.toISOString(),
        timeMax: now.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'updated',
      });

      this.logger.log(`Fetched ${events.data.items?.length} recently updated events`);

      for (const event of events.data.items || []) {
        await this.processEvent(event);
      }

      return { message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error('Webhook handler error:', error);
      throw error;
    }
  }

  private async processEvent(event: any) {
    this.logger.log(`Processing event: ${event.summary} (${event.id})`);

    if (!event.id) return;

    await this.prisma.meeting.updateMany({
      where: { googleEventId: event.id },
      data: {
        title: event.summary || 'Untitled',
        startTime: new Date(event.start?.dateTime || event.start?.date || new Date()),
        endTime: new Date(event.end?.dateTime || event.end?.date || new Date()),
        status:
          event.status === 'cancelled'
            ? 'cancelled'
            : event.status === 'confirmed'
            ? 'confirmed'
            : 'tentative',
      },
    });

    const attendees = event.attendees || [];
    for (const attendee of attendees) {
      if (attendee.email) {
        const user = await this.prisma.user.findUnique({
          where: { email: attendee.email },
        });

        if (user) {
          await this.prisma.meetingAttendee.updateMany({
            where: {
              userId: user.id,
              meeting: { googleEventId: event.id },
            },
            data: {
              status:
                attendee.responseStatus === 'accepted'
                  ? 'accepted'
                  : attendee.responseStatus === 'declined'
                  ? 'declined'
                  : attendee.responseStatus === 'tentative'
                  ? 'tentative'
                  : 'pending',
            },
          });
        }
      }
    }
  }
}