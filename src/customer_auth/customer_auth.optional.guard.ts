import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard('jwt-customer') {
    handleRequest(err: any, user: any) {
        // Nunca lanzar error
        // Si no hay user, seguimos como invitado
        return user || null;
    }
}
