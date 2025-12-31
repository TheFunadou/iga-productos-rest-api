import { Test, TestingModule } from '@nestjs/testing';
import { ECommerceController } from './e-commerce.controller';

describe('ECommerceController', () => {
  let controller: ECommerceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ECommerceController],
    }).compile();

    controller = module.get<ECommerceController>(ECommerceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
