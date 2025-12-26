import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateGroupDto } from "../controllers/dtos/group.input";

@Injectable()
export class createGroupUseCase{
    constructor(private readonly prisma:PrismaService){}
    async execute(userId:string,dto:CreateGroupDto){
        const group=await this .prisma.group.create({
            data:{
                name:dto.name,
                // members:{
                //     create:{
                //         userId:userId,
                //         role:'admin'
                //     }
                // }
        }})
        console.log(userId)
        await this.prisma.groupMembership.create({
            data:{
                groupId:group.id,
                userId:userId,
                role:'admin'
            }
        })
        return ({success:true,groupId:group.id})
}}