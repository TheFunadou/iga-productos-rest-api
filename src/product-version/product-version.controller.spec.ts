import { Test, TestingModule } from '@nestjs/testing';
import { ProductVersionController } from './product-version.controller';

describe('ProductVersionController', () => {
  let controller: ProductVersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductVersionController],
    }).compile();

    controller = module.get<ProductVersionController>(ProductVersionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
