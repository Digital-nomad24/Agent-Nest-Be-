import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class addMemberGroupUseCase {
    constructor(private readonly prisma: PrismaService) {}
    async execute(userId:string,groupId: string,) {
        const groupMember = await this.prisma.groupMembership.create({
            data: {
                groupId,
                userId,
            },
        });    
        return { success: true, groupMember, userId };
    }}