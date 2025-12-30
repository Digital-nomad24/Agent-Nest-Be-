import { Module } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-cases.provider';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SERVICE_PROVIDER } from './services/services.provider';
import { GoogleCalendarService } from 'src/google/services/google-calendar.service';
import { GoogleModule } from 'src/google/google.module';

@Module({
  imports:[GoogleModule,
    PassportModule.register({ defaultStrategy: 'jwt' }), 
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '7d' },
          }),
          inject: [ConfigService],
        })
    
  ],
  controllers: [CalendarController],
  providers: [...SERVICE_PROVIDER,...USE_CASE_PROVIDER,],
  
  
})
export class CalendarModule {}
