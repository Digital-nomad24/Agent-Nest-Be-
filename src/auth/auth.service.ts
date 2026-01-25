import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService,
    ) {}
    async signToken(userId: string,email:string): Promise<string> {
        const payload = { sub: userId,email:email };
        return this.jwtService.signAsync(payload);
    }
}