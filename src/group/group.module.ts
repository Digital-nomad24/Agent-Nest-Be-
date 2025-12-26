import { Module } from '@nestjs/common';
import { GroupController } from './controllers/group.controller';
import { USE_CASE_PROVIDER } from './use-cases/use-case.provider';

@Module({
  controllers: [GroupController],
  providers:[...USE_CASE_PROVIDER]
})
export class GroupModule {}
