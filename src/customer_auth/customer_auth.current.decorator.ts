import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CustomerPayload } from "./customer_auth.dto";

export const AuthenticatedCustomer = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CustomerPayload => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
