import { Body, Controller, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "src/auth/decorator";
import { ConnectTelegramDto } from "./dtos/telegram.input";
import { connectTelegramUseCase } from "../use-cases/connect-Telegram.use-case";
import { TelegramTaskWebhookUseCase } from "../use-cases/webhook-telegram.use-case";

@Controller('telegram')
export class telegramController{
    constructor(private readonly connectTelegramUseCase:connectTelegramUseCase,
                private readonly telegramTaskWebhookUseCase:TelegramTaskWebhookUseCase){}
    @Post('/connect')
    connect(@Body()dto:ConnectTelegramDto){
        return this.connectTelegramUseCase.execute(dto)  
    }
    @Post('/webhook')
    webhook(@Body()body:any){
        return this.telegramTaskWebhookUseCase.execute(body)
    }
}
