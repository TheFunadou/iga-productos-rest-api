import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from './user_auth.dto';

export const AuthenticatedUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): UserPayload => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
