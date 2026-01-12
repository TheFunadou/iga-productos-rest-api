import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard("jwt-customer") {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Para un guard opcional, siempre permitimos que la petición continúe
        // El método handleRequest se encargará de devolver null si no hay usuario
        const result = super.canActivate(context);

        if (result instanceof Promise) return result.then(() => true).catch(() => true);

        // Si es Observable o boolean, simplemente devolvemos true
        return true;
    };

    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any): any {
        if (err || !user) return null;
        return user;
    };
}