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
import { JwtService } from '@nestjs/jwt';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private googleCalendarService: GoogleCalendarService,
    private googleWebhookService: GoogleWebhookService,
    private googleAuthService: GoogleAuthService,
    private JwtService:JwtService
  ) {}

  @Get('signin')
@UseGuards(AuthGuard('google'))
async googleSignIn(){}


@Get('signin/callback')
@UseGuards(AuthGuard('google'))
async googleSignInCallback(@Req() req, @Res() res: Response) {
  try {
    const user = req.user;
    const token = await this.googleAuthService.generateJwtToken(user);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';

    console.log("=".repeat(50));
    console.log("📋 Query params:", req.query);

    let state: any = {};

    // ✅ Verify JWT-based OAuth state
    if (req.query.state) {
      try {
        const stateStr = String(req.query.state);
        state = this.JwtService.verify(stateStr);
        console.log("✅ Verified state:", state);
      } catch (err) {
        console.warn('⚠️ Invalid or expired OAuth state:', req.query.state);
        console.error(err);
      }
    }

    // ✅ Booking flow
    if (state.flow === 'booking' && state.redirectTo) {
      console.log(`🔄 Booking flow detected, redirecting to: ${state.redirectTo}`);
      return res.redirect(
        `${clientUrl}${state.redirectTo}?authToken=${token}`
      );
    }

    // ✅ Normal login flow
    console.log("🔄 Normal login flow");
    return res.redirect(`${clientUrl}/auth/callback?token=${token}`);

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';
    return res.redirect(`${clientUrl}/auth/error?message=oauth_failed`);
  }
}


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
      const authUrl = this.googleCalendarService.getAuthUrl(userId);
      console.log('🔗 Redirecting to:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('❌ Connect calendar error:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/dashboard?error=connection_failed`);
    }
  }

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

  @Get('calendar-status')
  @UseGuards(AuthGuard('jwt'))
  async getCalendarStatus(@Req() req) {
    const userId = req.user.id;
    const status = await this.googleCalendarService.getConnectionStatus(userId);
    
    return {
      connected: status.connected,
      tokenValid: status.tokenValid,
      hasRefreshToken: status.hasRefreshToken,
      groupId: null,
    };
  }

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