import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class retrieveGroupsUseCase {
    constructor(private readonly prisma:PrismaService){}
    async execute(userId:string){
        const groups = await this.prisma.groupMembership.findMany({
            where:{userId:userId},
            include:{
                group:true
            }
        })
        return {success:true,groups};
    }
}