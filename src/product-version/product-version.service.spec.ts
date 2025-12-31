import { Test, TestingModule } from '@nestjs/testing';
import { ProductVersionService } from './product-version.service';

describe('ProductVersionService', () => {
  let service: ProductVersionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductVersionService],
    }).compile();

    service = module.get<ProductVersionService>(ProductVersionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
