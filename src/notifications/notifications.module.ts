import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ResendProvider } from './providers/resend.provider';

@Module({
  providers: [NotificationsService, ResendProvider],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule { }
