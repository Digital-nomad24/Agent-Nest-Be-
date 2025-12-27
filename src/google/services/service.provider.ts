import { GoogleAuthService } from "./google-auth.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleWebhookService } from "./google-webhook.service";

export const SERVICE_PROVIDER=[GoogleCalendarService,GoogleWebhookService,GoogleAuthService]