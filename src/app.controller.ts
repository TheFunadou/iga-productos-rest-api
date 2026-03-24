import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() { }

  @Get()
  async init(): Promise<string> {
    return "ok";
  };
}
