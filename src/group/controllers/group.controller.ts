import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { addMemberGroupUseCase } from "../use-cases/add-member-group.use-case";
import { removeMemberGroupUseCase } from "../use-cases/leave-group.use-case";
import { retrieveGroupsUseCase } from "../use-cases/retrieve-groups.use-case";
import { retrieveGroupMembersUseCase } from "../use-cases/retrieve-group-members.use-case";
import { createGroupUseCase } from "../use-cases/create-group.use-case";

import { CurrentUser } from "src/auth/decorator/current-user.decorator";
import { CreateGroupDto } from "./dtos/group.input";

@UseGuards(AuthGuard("jwt"))
@Controller("group")
export class GroupController {
  constructor(
    private readonly addMemberGroupUseCase: addMemberGroupUseCase,
    private readonly removeMemberGroupUseCase: removeMemberGroupUseCase,
    private readonly retrieveGroupUseCase: retrieveGroupsUseCase,
    private readonly retrieveGroupMembersUseCase: retrieveGroupMembersUseCase,
    private readonly createGroupUseCase: createGroupUseCase
  ) {}

  // ✅ Get all groups of logged-in user
  @Get("/groups")
  getGroups(@CurrentUser() user: any) {
    return this.retrieveGroupUseCase.execute(user.id);
  }

  // ✅ Get members of a group
  @Get("/groupMembers/:groupId")
  getGroupMembers(@Param("groupId") groupId: string) {
    return this.retrieveGroupMembersUseCase.execute(groupId);
  }

  // ✅ Create group
  @Post("/create")
  createGroup(@CurrentUser() user: any, @Body() dto: CreateGroupDto) {
    return this.createGroupUseCase.execute(user.id, dto);
  }

  // ✅ Add member to group (FIXED)
  @Post("/add/:groupId")
  addMember(
    @CurrentUser("id") userId: string,
    @Param("groupId") groupId: string
  ) {
    return this.addMemberGroupUseCase.execute(userId, groupId);
  }

  // ✅ Leave group
  @Delete("/delete/:groupId")
  leaveGroup(
    @CurrentUser("id") userId: string,
    @Param("groupId") groupId: string
  ) {
    return this.removeMemberGroupUseCase.execute(userId, groupId);
  }
}
