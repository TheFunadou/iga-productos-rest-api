import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard("jwt-customer") {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context) as boolean | Promise<boolean>;
    };

    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any): any {
        if (err || !user) return null;
        return user;
    }
}