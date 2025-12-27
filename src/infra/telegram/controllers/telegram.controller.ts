import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "src/auth/decorator";
import { ConnectTelegramDto } from "./dtos/telegram.input";
import { connectTelegramUseCase } from "../use-cases/connect-Telegram.use-case";
import { TelegramTaskWebhookUseCase } from "../use-cases/webhook-telegram.use-case";

@Controller('telegram')
export class telegramController{
    constructor(private readonly connectTelegramUseCase:connectTelegramUseCase,
                private readonly telegramTaskWebhookUseCase:TelegramTaskWebhookUseCase){}
    @UseGuards(AuthGuard('jwt'))            
    @Post('/connect')
    connect(@CurrentUser()user,@Body()dto:ConnectTelegramDto){
        return this.connectTelegramUseCase.execute(user.id,dto)  
    }
    @Post('/webhook')
    webhook(@CurrentUser()user,@Body()body:any){
        return this.telegramTaskWebhookUseCase.execute(body)
    }
}
