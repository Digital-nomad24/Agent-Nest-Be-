import { IsNotEmpty, IsString } from "class-validator";

export class ConnectTelegramDto{
    @IsString()
    @IsNotEmpty()
    telegramChatId: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

}