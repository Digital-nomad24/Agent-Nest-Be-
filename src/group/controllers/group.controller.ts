import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { addMemberGroupUseCase } from '../use-cases/add-member-group.use-case';
import { removeMemberGroupUseCase } from '../use-cases/leave-group.use-case';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { retrieveGroupsUseCase } from '../use-cases/retrieve-groups.use-case';
import { retrieveGroupMembersUseCase } from '../use-cases/retrieve-group-members.use-case';
import { AuthGuard } from '@nestjs/passport';
import { createGroupUseCase } from '../use-cases/create-group.use-case';
import { CreateGroupDto } from './dtos/group.input';
@UseGuards(AuthGuard('jwt'))
@Controller('group')
export class GroupController {
    constructor(private readonly addMemberGroupUseCase:addMemberGroupUseCase,
                private readonly removeMemberGroupUseCase:removeMemberGroupUseCase,
                private readonly retrieveGroupUseCase:retrieveGroupsUseCase,
                private readonly retrieveGroupMembersUseCase:retrieveGroupMembersUseCase,
                private readonly createGroupUseCase:createGroupUseCase
    ) {}
    @Delete('/delete/:groupId')
    deleteMember(@CurrentUser('id') userId:string,@Param('groupId') groupId:string){
        return this.removeMemberGroupUseCase.execute(userId,groupId);
    }
    @Post('/add/:groupId/:id')
    addMember(@Param('id') userId:string,@Param('groupId') groupId:string){
        return this.addMemberGroupUseCase.execute(userId,groupId);
    }
    @Get("/groups")
    getGroups(@CurrentUser('id') userId:string){
        return this.retrieveGroupUseCase.execute(userId);
    }
    @Get('/groupMembers/:groupId')
    getGroupMembers(@Param('groupId') groupId:string){
        return this.retrieveGroupMembersUseCase.execute(groupId);
    }
    @Post('/create')
    createGroup(@CurrentUser()user,@Body() dto:CreateGroupDto){
        return this.createGroupUseCase.execute(user.id,dto);
    }
}
