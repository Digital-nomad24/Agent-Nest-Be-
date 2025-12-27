// src/google/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: 'http://localhost:3333/auth/google/signin/callback',
      scope: ['email', 'profile'],
    });
  }

  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id: googleId, emails, displayName, name } = profile;
      const email = emails?.[0]?.value;
      const userName = displayName || name?.givenName || '';

      if (!email) {
        return done(new Error('Email not found in Google profile'), false);
      }

      let user = await this.prisma.user.findUnique({ 
        where: { googleId } 
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken || user.googleRefreshToken,
          },
        });
        return done(null, user);
      }

      user = await this.prisma.user.findUnique({ 
        where: { email } 
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            provider: 'google',
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken || user.googleRefreshToken,
          },
        });
        return done(null, user);
      }

      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name: userName,
          provider: 'google',
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        },
      });

      return done(null, user);
    } catch (error) {
      console.error('[Google OAuth Error]', error);
      return done(error, false);
    }
  }
}