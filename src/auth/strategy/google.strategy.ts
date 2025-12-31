// src/google/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private JwtService:JwtService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: 'https://agent-nest-be.onrender.com/auth/google/signin/callback',
      scope: ['email', 'profile'],
      state: true,
      passReqToCallback: true, // ✅ Add this to get req in validate
    });
  }

  authorizationParams(req: any): { [key: string]: string } {
  const { flow, redirectTo } = req.query;

  if (flow && redirectTo) {
    const state =this.JwtService.sign(
      { flow, redirectTo },
      { expiresIn: '1h' },
    );

    return {
      access_type: 'offline',
      prompt: 'consent',
      state,
    };
  }

  return {
    access_type: 'offline',
    prompt: 'consent',
  };
}


  async validate(
    req: any, // ✅ Now we get the request object
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