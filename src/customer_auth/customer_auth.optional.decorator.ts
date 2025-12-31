import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CustomerPayload } from "./customer_auth.dto";

export const OptionalCustomer = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CustomerPayload | null => {
        const request = ctx.switchToHttp().getRequest();
        if (request.user) return request.user;
        return null;
    },
);
