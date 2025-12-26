import { Body, Controller, Delete, Get,Param,Post,Put,Req,UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { createTaskUseCase } from "../use-cases/create-tasks.use-case";
import { CreateTaskDto } from "./dto/tasks";
import { CurrentUser } from "src/auth/decorator";
import { listTasksUseCase } from "../use-cases/list-tasks.use-case";
import { retrieveTaskUseCase } from "../use-cases/retrieve-tasks.use-case";
import { deleteTaskUseCase } from "../use-cases/delete-tasks.use-case";
import { updateTaskUseCase } from "../use-cases/update-tasks.use-case";
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TaskController{
    constructor(private createTaskUseCase:createTaskUseCase,
                private listTaskUseCase:listTasksUseCase,
                private retrieveTaskUseCase:retrieveTaskUseCase,
                private deleteTaskUseCase:deleteTaskUseCase,
                private updateTaskUseCase:updateTaskUseCase
    ) {}
    

    @Post('createTask')
    createTask(@CurrentUser()user,@Body()dto:CreateTaskDto){
        return this.createTaskUseCase.execute(user.id,dto)
    }
    
    @Get('listTasks')
    listTask(@CurrentUser()user){
        return this.listTaskUseCase.execute(user.id)
    }
    @Get('retrieveTask/:id')
    retrieveTask(@CurrentUser()user,@Param('id')taskId){
        return this.retrieveTaskUseCase.execute(user.id,taskId)
    }
    @Delete('deleteTask/:id')
    deleteTask(@CurrentUser()user,@Param('id')taskId){
        return this.deleteTaskUseCase.execute(user.id,taskId)
    }
    @Put('updateTask/:id')
    updateTask(@CurrentUser()user,@Param('id')taskId,@Body()dto){
        return this.updateTaskUseCase.execute(user.id,taskId,dto)
    }
}