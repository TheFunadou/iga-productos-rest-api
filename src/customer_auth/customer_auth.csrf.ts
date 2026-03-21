import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class CustomerCsrfAuthGuard implements CanActivate {
    constructor(private readonly cacheService: CacheService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Safe methods don't need CSRF validation
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

        // 1. Token from header (sent by the frontend from the csrf_token cookie)
        const headerCsrfToken = request.headers['x-csrf-token'];
        if (!headerCsrfToken || typeof headerCsrfToken !== 'string') {
            throw new ForbiddenException('Token CSRF no proporcionado');
        }

        // 2. session_id to find in cache
        const sessionId = request.cookies?.['session_id'];
        if (!sessionId) throw new ForbiddenException('Sesión no encontrada');

        // 3. Token stored in cache under the session created by the middleware
        const cached = await this.cacheService.getData<{ csrfToken: string }>({
            entity: `session:${sessionId}`,
        });
        if (!cached?.csrfToken) {
            throw new ForbiddenException('Sesión expirada o inválida');
        }

        // 4. Cookie csrf_token (the middleware sets it as httpOnly: false)
        const cookieCsrfToken = request.cookies?.['csrf_token'];
        if (!cookieCsrfToken) throw new ForbiddenException('Cookie CSRF no encontrada');

        // 5. Triple validation with constant time comparison
        const allMatch =
            this.safeCompare(headerCsrfToken, cookieCsrfToken) &&
            this.safeCompare(headerCsrfToken, cached.csrfToken);

        if (!allMatch) throw new ForbiddenException('Token CSRF inválido');

        return true;
    }

    private safeCompare(a: string, b: string): boolean {
        // If they differ in length, we already know they don't match — but we equalize
        // the buffers to not filter that info by timing
        const lenA = Buffer.byteLength(a);
        const lenB = Buffer.byteLength(b);
        const maxLen = Math.max(lenA, lenB);
        const bufA = Buffer.alloc(maxLen);
        const bufB = Buffer.alloc(maxLen);
        bufA.write(a);
        bufB.write(b);
        return timingSafeEqual(bufA, bufB) && lenA === lenB;
    }
}