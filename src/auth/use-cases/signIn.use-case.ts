import { ConflictException, Controller, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserSignInDto } from "../../user/controllers/dtos/user.input";
import bcrypt from 'bcrypt'
import { UserRepo } from "../repos/user.repo";
import { AuthService } from "src/auth/auth.service";
@Injectable()
export class SigninUseCase {
  constructor(private readonly userRepo:UserRepo,
    private readonly AuthService:AuthService
  ) {}

  async execute(
    dto: UserSignInDto,
  ) {
    const{email,password}=dto;
    if(!email||!password){
      throw new Error('Email and password are required');
    }
    const user= await this.userRepo.findbyEmail({email});
    const isPasswordValid= await bcrypt.compare(password,user?.password);
    if(!isPasswordValid){
      throw new ConflictException('Invalid credentials');
    }
    if(!user){
      throw new NotFoundException('User not found');
    }
    const token=await this.AuthService.signToken(user.id,user.email);
    return token;
  }
}