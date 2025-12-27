// services/task-extraction.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { TaskPriority, TaskStatus } from 'src/tasks/controllers/dto/tasks';
import { z } from 'zod';

@Injectable()
export class TaskExtractionService {
  private readonly logger = new Logger(TaskExtractionService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
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
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent) {
      this.logger.error('No response from OpenAI');
      return null;
    }

    try {
      // Extract JSON block from model response
      const match = rawContent.match(/\{[\s\S]*\}/);

      if (!match) {
        this.logger.debug('No JSON found in OpenAI response');
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

      return {
        title: validated.title,
        description: validated.description ?? '',
        status: validated.status,
        priority: validated.priority,
        dueDate: new Date(validated.dueDate).toISOString(),
      };
    } catch (err) {
      this.logger.error('Failed to parse task from OpenAI response', rawContent);
      return null;
    }
  }
}
