// src/google/controllers/google.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Req, 
  Res, 
  UseGuards,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { GoogleCalendarService } from './services/google-calendar.service';
import { GoogleWebhookService } from './services/google-webhook.service';
import { GoogleAuthService } from './services/google-auth.service';


@Controller('auth/google')
export class GoogleController {
  constructor(
    private googleCalendarService: GoogleCalendarService,
    private googleWebhookService: GoogleWebhookService,
    private googleAuthService: GoogleAuthService,
  ) {}

  @Get('signin')
  @UseGuards(AuthGuard('google')) 
  async googleSignIn() {
    // GoogleAuthGuard redirects to Google
  }

@Get('signin/callback')
@UseGuards(AuthGuard('google'))
async googleSignInCallback(@Req() req, @Res() res: Response) {
  const user = req.user; // populated by GoogleStrategy
  const token = await this.googleAuthService.generateJwtToken(user);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';
  if (!req.user) {
    return res.redirect(
      `${process.env.CLIENT_URL}/signin?error=google_auth_failed`
    );
  }
  // ✅ Default normal login flow
  return res.redirect(`${clientUrl}/auth/callback?token=${token}`);
}

  // NEW: Return auth URL instead of redirecting (so frontend can handle the redirect)
  @Get('get-calendar-auth-url')
  @UseGuards(AuthGuard('jwt'))
  async getCalendarAuthUrl(@Req() req) {
    try {
      const userId = req.user.id;
      console.log('🔐 Getting calendar auth URL for user:', userId);
      const authUrl = this.googleCalendarService.getAuthUrl(userId);
      console.log('🔗 Generated auth URL');
      return { authUrl };
    } catch (error) {
      console.error('❌ Get auth URL error:', error);
      throw error;
    }
  }

  @Get('connect-calendar')
  async connectCalendar(@Req() req, @Res() res: Response) {
    try {
      const userId = req.user.id;
      console.log('🔐 Connecting calendar for user:', userId);
      const authUrl = await this.googleCalendarService.getAuthUrl(userId);
      console.log('🔗 Redirecting to:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('❌ Connect calendar error:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard?error=connection_failed`);
    }
  }

  // Calendar OAuth callback
  @Get('callback')
  async calendarCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.googleCalendarService.handleCallback(code, state);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard?calendarConnected=true`);
    } catch (error) {
      console.error('Calendar callback error:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard?calendarConnected=false&error=true`);
    }
  }

  // Calendar status - FIXED: Now properly returns actual connection status
  @Get('calendar-status')
  @UseGuards(AuthGuard('jwt'))
  async getCalendarStatus(@Req() req) {
    const userId = req.user.id;
    
    // Get actual connection status from service
    const status = await this.googleCalendarService.getConnectionStatus(userId);
    
    // You can also fetch group info if needed
    // For now, returning just the connection status
    return {
      connected: status.connected,
      tokenValid: status.tokenValid,
      hasRefreshToken: status.hasRefreshToken,
      groupId: null, // Add this if you have group logic
    };
  }

  // Webhook endpoint for Google Calendar notifications
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-resource-state') resourceState: string,
    @Headers('x-goog-resource-id') resourceId: string,
  ) {
    return this.googleWebhookService.handleWebhook(
      channelId,
      resourceState,
      resourceId,
    );
  }
}