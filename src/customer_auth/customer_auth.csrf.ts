import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Observable } from "rxjs";


@Injectable()
export class CustomerCsrfAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Get the request
        const request = context.switchToHttp().getRequest();
        // Exlude safe methods
        if (["GET", "HEAD", "OPTIONS"].includes(request.method)) { return true; };
        // Get csrf token from the header of the request
        const csrfToken = request.headers["x-csrf-token"] || request.body?.csrfToken;
        if (!csrfToken) throw new UnauthorizedException("Token CSRF no proporcionado");
        // Get csrf token from the cookies
        const sessionToken = request.cookies?.["iga_customer_csrf_token"];
        if (!csrfToken || !sessionToken || csrfToken !== sessionToken) throw new UnauthorizedException("Token CSRF invalido");
        return true;
    };
}