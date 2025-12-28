import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TaskExtractionService } from '../services/task-extraction.service';
import { taskExtractPrompt } from 'src/libs/prompts';
import { createTaskUseCase } from 'src/tasks/use-cases/create-tasks.use-case';
import { CurrentUser } from 'src/auth/decorator';
import { AuthGuard } from '@nestjs/passport';
@UseGuards(AuthGuard('jwt'))
@Controller('ai-completions')
export class AiCompletionsController {
    constructor(private readonly TaskExtractionService:TaskExtractionService,
                private readonly createTaskUseCase:createTaskUseCase){}
    @Post('/extract-task')
    async extractTask(@CurrentUser()user,@Body() body:any){
        console.log(body)
        const data= await this.TaskExtractionService.extractTask(body.message,taskExtractPrompt)
        if(!data){
            return new BadRequestException("Task data not created")
        }
        console.log("This is ai route ".repeat(5))
        console.log(data)
        return await this.createTaskUseCase.execute(user.id,data)
    }
}
