import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { SigninUseCase } from "../use-cases/signIn.use-case";
import { UserSignInDto, UserSignUpDto } from "./dtos/user.input";
import { SignupUseCase } from "../use-cases/signUp.use-case";
import { AuthGuard } from "@nestjs/passport";

@Controller('auth')
export class AuthController{
    constructor(private signinUseCase:SigninUseCase,
                private signupUseCase:SignupUseCase
     ) {}
    @Post('signin')
    signin(@Body() dto:UserSignInDto){
        return this.signinUseCase.execute(dto);
    }

    @Post('signup')
    signup(@Body() dto:UserSignUpDto){
       return this.signupUseCase.execute(dto);
    }
    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(){
        return "auth guard working"
    }
}