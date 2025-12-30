import { CalendarBookingUseCase } from "./book-calendar-slot.use-case";
import { CreateCalendarEventUseCase } from "./create-calendar-event.use-case";
import { CalendarShareUseCase } from "./share-calendar.use-case";
import { CalendarSyncUseCase } from "./sync-calendar.use-case";

export const USE_CASE_PROVIDER=[CalendarSyncUseCase,CreateCalendarEventUseCase,CalendarBookingUseCase,CalendarShareUseCase]