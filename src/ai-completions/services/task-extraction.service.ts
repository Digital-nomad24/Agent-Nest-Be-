// services/task-extraction.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TaskPriority, TaskStatus } from 'src/tasks/controllers/dto/tasks';
import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';

@Injectable()
export class TaskExtractionService {
  private readonly logger = new Logger(TaskExtractionService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY')!,
    );
  }

  async extractTask(
    message: string,
    systemPrompt: string,
  ): Promise<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
  } | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: message },
      ]);

      const rawContent = result.response.text();

      if (!rawContent) {
        this.logger.error('No response from Gemini');
        return null;
      }

      // Extract JSON block
      const match = rawContent.match(/\{[\s\S]*\}/);

      if (!match) {
        this.logger.debug('No JSON found in Gemini response');
        return null;
      }

      const parsed = JSON.parse(match[0]);

      const taskSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(TaskStatus),
        priority: z.enum(TaskPriority),
        dueDate: z.string(),
      });

      const validated = taskSchema.parse(parsed);

      const utcDate = fromZonedTime(
        validated.dueDate,
        'Asia/Kolkata',
      );

      return {
        title: validated.title,
        description: validated.description ?? '',
        status: validated.status,
        priority: validated.priority,
        dueDate: utcDate.toISOString(),
      };
    } catch (err) {
      this.logger.error('Failed to parse task from Gemini response', err);
      return null;
    }
  }
}
