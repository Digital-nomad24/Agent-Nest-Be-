import { addMemberGroupUseCase } from "./add-member-group.use-case";
import { createGroupUseCase } from "./create-group.use-case";
import { removeMemberGroupUseCase } from "./leave-group.use-case";
import { retrieveGroupMembersUseCase } from "./retrieve-group-members.use-case";
import { retrieveGroupsUseCase } from "./retrieve-groups.use-case";

export const USE_CASE_PROVIDER=[
    addMemberGroupUseCase,
    createGroupUseCase,
    removeMemberGroupUseCase,
    retrieveGroupMembersUseCase,
    retrieveGroupsUseCase,
]