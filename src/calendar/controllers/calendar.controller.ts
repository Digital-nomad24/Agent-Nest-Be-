import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarSyncUseCase } from '../use-cases/sync-calendar.use-case';
import { CalendarBookingUseCase } from '../use-cases/book-calendar-slot.use-case';
import { CalendarShareUseCase } from '../use-cases/share-calendar.use-case';
import { BookSlotDto } from './dtos/book-slot.input';
import { CreateEventDto } from './dtos/create-event.input';
import { CreateShareLinkDto } from './dtos/create-share-link.input';
import { CreateCalendarEventUseCase } from '../use-cases/create-calendar-event.use-case';
import { CurrentUser } from 'src/auth/decorator';



@Controller('calendar')
@UseGuards(AuthGuard('jwt'))
export class CalendarController {
  constructor(
    private readonly CalendarSyncUseCase: CalendarSyncUseCase,
    private readonly CreateCalendarEventUseCase: CreateCalendarEventUseCase,
    private readonly calendarShareUseCase: CalendarShareUseCase,
    private readonly calendarBookingUseCase: CalendarBookingUseCase,
  ) {}

  /**
   * POST /calendar/sync-calendar
   * Syncs the current month's events from Google Calendar
   */
  @Post('sync-calendar')
  @HttpCode(HttpStatus.OK)
  async syncCalendar(@CurrentUser()user) {
    return this.CalendarSyncUseCase.syncCurrentMonth(user.id);
  }

  /**
   * POST /calendar/add-event
   * Creates a new meeting and pushes it to Google Calendar
   */
  @Post('add-event')
  @HttpCode(HttpStatus.CREATED)
  async addEvent(
    @CurrentUser() user,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.CreateCalendarEventUseCase.createEvent(user.id, createEventDto);
  }

  /**
   * POST /calendar/share-link
   * Generates a shareable calendar link with availability preferences
   */
  @Post('share-link')
  @HttpCode(HttpStatus.CREATED)
  async createShareLink(
    @CurrentUser() user,
    @Body() createShareLinkDto: CreateShareLinkDto,
  ) {
    return this.calendarShareUseCase.createShareLink(user.id, createShareLinkDto);
  }

  /**
   * GET /calendar/share/:token/freebusy
   * Gets free/busy information for a shared calendar link (Public endpoint)
   */
  @Get('share/:token/freebusy')
  async getFreeBusy(@Param('token') token: string) {
    return this.calendarShareUseCase.getFreeBusy(token);
  }

  /**
   * POST /calendar/share/:token/book
   * Books a time slot through a shared calendar link
   */
  @Post('share/:token/book')
  @HttpCode(HttpStatus.CREATED)
  async bookSlot(
   @CurrentUser() user,
    @Param('token') token: string,
    @Body() bookSlotDto: BookSlotDto,
  ) {
    return this.calendarBookingUseCase.bookSlot(user.id, token, bookSlotDto);
  }
}