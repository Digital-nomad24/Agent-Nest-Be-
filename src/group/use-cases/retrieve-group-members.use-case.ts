import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class retrieveGroupMembersUseCase {
    constructor(private readonly prisma:PrismaService){}
    async execute(groupId:string){
        const group = await this.prisma.group.findUnique({
            where:{
                id:groupId
            },
            include:{
                members:true
            }
        })
        if(group){
            const members = group.members.map(member=>member.userId);
            return {success:true,groupId,members};
        }
        else{
            return new ConflictException("Group does not exist");
        }
    }   
}