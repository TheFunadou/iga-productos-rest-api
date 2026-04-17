import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookie = createParamDecorator(
    (cookieName: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.cookies?.[cookieName] ?? null;
    },
);