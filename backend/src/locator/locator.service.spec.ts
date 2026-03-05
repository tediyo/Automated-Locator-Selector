import { Test, TestingModule } from '@nestjs/testing';
import { LocatorService } from './locator.service';

describe('LocatorService', () => {
  let service: LocatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocatorService],
    }).compile();

    service = module.get<LocatorService>(LocatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
