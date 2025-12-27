import { connectTelegramUseCase } from "./connect-Telegram.use-case";
import { TelegramTaskWebhookUseCase } from "./webhook-telegram.use-case";

export const USE_CASE_PROVIDER=[connectTelegramUseCase,TelegramTaskWebhookUseCase]