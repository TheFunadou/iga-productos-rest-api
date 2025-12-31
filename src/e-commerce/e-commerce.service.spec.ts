import { Test, TestingModule } from '@nestjs/testing';
import { ECommerceService } from './e-commerce.service';

describe('ECommerceService', () => {
  let service: ECommerceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ECommerceService],
    }).compile();

    service = module.get<ECommerceService>(ECommerceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
