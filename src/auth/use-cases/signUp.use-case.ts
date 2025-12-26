import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserSignUpDto } from "../../user/controllers/dtos/user.input";
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

@Injectable()
export class SignupUseCase {
    constructor(private prisma: PrismaService) {}
    
    async execute(dto: UserSignUpDto) {
        const { name, email, password } = dto;
        
        const existingUser = await this.prisma.user.findUnique({
            where: { email }
        });
        
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}