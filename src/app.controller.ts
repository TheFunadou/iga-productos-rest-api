import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("example")
  @ApiOperation({ summary: "Example" })
  async getHello(): Promise<any> {
    return await this.appService.example();
  };


  @Get("example2")
  @ApiOperation({ summary: "Example2" })
  async getHello2(): Promise<any> {
    return await this.appService.example2();
  };
}
