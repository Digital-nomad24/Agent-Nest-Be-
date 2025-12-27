import { Test, TestingModule } from '@nestjs/testing';
import { AiCompletionsService } from './services/ai-completions.service';

describe('AiCompletionsService', () => {
  let service: AiCompletionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiCompletionsService],
    }).compile();

    service = module.get<AiCompletionsService>(AiCompletionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
