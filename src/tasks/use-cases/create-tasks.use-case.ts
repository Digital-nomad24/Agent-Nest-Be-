import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateTaskDto } from "src/tasks/controllers/dto/tasks";

export const getPriorityOrder = (priority: 'high' | 'medium' | 'low'): number => {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default:
      console.warn(`Unknown priority value: ${priority}. Defaulting to 99.`);
      return 99;
  }
};
@Injectable()
export class createTaskUseCase{
    constructor(private prisma:PrismaService){
    }
    async execute(userId:string,dto:CreateTaskDto){
        try{
            const { title, status, priority, dueDate, description } = dto
            const priorityOrder=getPriorityOrder(priority)
            const newTask= await this.prisma.task.create({
        data: {
        title,
        description,
        status,
        priority,
        priorityOrder,
        dueDate: new Date(dueDate),
        userId: userId,
      },
      select:{
        id:true,
        description:true,
        status:true,
        createdAt:true
      }

        })
        return newTask;
        }
        catch(e){
            return new Error("Error Creating task")
        }
}
}