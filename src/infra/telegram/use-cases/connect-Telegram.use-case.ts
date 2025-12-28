import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "prisma/prisma.service";
import { ConnectTelegramDto } from "../controllers/dtos/telegram.input";
import bcrypt from 'bcrypt'
@Injectable()
export class connectTelegramUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async execute(dto: ConnectTelegramDto) {
    console.log("Reached the telegram Route");

    const { telegramChatId, email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("Account not found");
    }

    console.log("Reached the telegram Route 2");

    if (user.telegramChatId && user.telegramChatId !== String(telegramChatId)) {
      throw new ConflictException("Account already linked");
    }

    if ((user.provider === "local" || !user.provider) && user.password) {
      if (!password) {
        throw new BadRequestException("Password is required");
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    if (user.provider === "google" && password) {
      throw new BadRequestException("Google accounts do not require password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: String(telegramChatId) },
    });

    return { success: true };
  }
}
