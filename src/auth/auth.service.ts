import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}
    async signToken(userId: string,email:string): Promise<string> {
        const payload = { sub: userId,email:email };
        return this.jwtService.signAsync(payload,{
            expiresIn: '1h',
            secret: this.configService.get('JWT_SECRET'),
        });
    }
}
