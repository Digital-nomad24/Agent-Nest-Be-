import { Body, Controller, Delete, Get,Param,Post,Put,Req,UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController{
    constructor() {}
    
    @Get('/profile')
    getProfile(@Req() req){
        return req.user;
    }
    
}