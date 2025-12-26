import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "src/auth/decorator";
import { ConnectTelegramDto } from "./dtos/telegram.input";
import { connectTelegramUseCase } from "../use-cases/connect-Telegram.use-case";
@UseGuards(AuthGuard('jwt'))
@Controller('telegram')
export class telegramController{
    constructor(private readonly connectTelegramUseCase:connectTelegramUseCase ){}

    @Post('/connect')
    connect(@CurrentUser()user,@Body()dto:ConnectTelegramDto){
        return this.connectTelegramUseCase.execute(user.id,dto)  
    }
}
