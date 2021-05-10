import { Test, TestingModule } from '@nestjs/testing';
import { InternalConfigService } from './internal-config.service';

describe('InternalConfigService', () => {
  let service: InternalConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternalConfigService],
    }).compile();

    service = module.get<InternalConfigService>(InternalConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
