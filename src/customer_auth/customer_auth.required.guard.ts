import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";


@Injectable()
export class RequiredCustomerAuthGuard extends AuthGuard("jwt-customer") {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    };

    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
        if (err || !user) throw new UnauthorizedException("Necesitas estar autenticado para acceder a este recurso");
        return user;
    }
}