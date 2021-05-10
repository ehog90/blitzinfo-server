import { Test, TestingModule } from '@nestjs/testing';
import { LightningMapsService } from './lightning-maps.service';

describe('LightningMapsService', () => {
  let service: LightningMapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LightningMapsService],
    }).compile();

    service = module.get<LightningMapsService>(LightningMapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
