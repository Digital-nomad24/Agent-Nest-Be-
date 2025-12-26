import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class removeMemberGroupUseCase{
    constructor(private readonly prisma:PrismaService){}
    async execute(userId:string,groupId:string){
        const group = await this.prisma.group.findUnique({
            where:{
                id:groupId
            },
            include:{
                members:true
            }
        })
        if(!group){
            return new ConflictException("Group does not exist");
        }
        const isMember = group.members.find(member=>member.userId===userId);
        if(!isMember){
            return new ConflictException("User is not a member of the group");
        }
        await this.prisma.groupMembership.deleteMany({
            where:{
                groupId,
                userId
            }
        })
        return {success:true,groupId,userId};   
}}