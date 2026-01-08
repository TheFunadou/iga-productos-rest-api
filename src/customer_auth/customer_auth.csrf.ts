import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Observable } from "rxjs";
import { CacheService } from "src/cache/cache.service";


@Injectable()
export class CustomerCsrfAuthGuard implements CanActivate {
    constructor(
        private readonly cacheService: CacheService
    ) { };
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get the request
        const request = context.switchToHttp().getRequest();
        // Exlude safe methods
        if (["GET", "HEAD", "OPTIONS"].includes(request.method)) { return true; };

        const customer = request.user;
        if (!customer || !customer.uuid) throw new UnauthorizedException("Cliente no autenticado");

        // Get csrf token from the header of the request
        const headerCsrfToken = request.headers["x-csrf-token"] || request.body?.csrfToken;
        if (!headerCsrfToken) throw new UnauthorizedException("Token CSRF no proporcionado");

        const cachedCsrfToken = await this.cacheService.getData<{ csrfToken: string }>({ entity: "customer:session:csrf", query: { customerUUID: customer.uuid } });
        if (!cachedCsrfToken || !cachedCsrfToken.csrfToken) throw new UnauthorizedException("Token CSRF no encontrado o expirado");

        // Get csrf token from the cookies
        const sessionToken = request.cookies?.["iga_customer_csrf_token"];
        if (!headerCsrfToken || !sessionToken || headerCsrfToken !== sessionToken || headerCsrfToken !== cachedCsrfToken.csrfToken) throw new UnauthorizedException("Token CSRF invalido");
        return true;
    };
}