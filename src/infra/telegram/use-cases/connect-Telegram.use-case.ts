import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { NotFoundError } from "rxjs";
import bcrypt from 'bcrypt'
import { ConnectTelegramDto } from "../controllers/dtos/telegram.input";
import { JwtService } from "@nestjs/jwt";
@Injectable()
export class connectTelegramUseCase{
    constructor(private readonly prisma:PrismaService,
                private readonly JwtService:JwtService
    ){
    }
    async execute(token:string,dto:ConnectTelegramDto){
      console.log("Reached the telegram Route")
       const tokenUser=await this.JwtService.verifyAsync(token)
        console.log("Reached the telegram Route 2")
          const {telegramChatId, email, password } = dto;
          const user=await this.prisma.user.findUnique({
            where:{
                email
            }
          })
          if(!user || tokenUser.sub!==user.id){
            return new NotFoundException('account Not found')
          }
          if (
      user.telegramChatId && 
      user.telegramChatId !== String(telegramChatId)
    ) {
      return new ConflictException("account already linked")
    }
    if ((user.provider === "local" || !user.provider) && user.password) {
      if (!password) {
        return 
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return new UnauthorizedException
      }
    } else if (user.provider === "google") {
      if (password) {
        return new BadRequestException("this does not require password")
      }
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: String(telegramChatId) }
    });
    return {success:true}
    }
}