import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CookieOptions, Request, Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/cache.service';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_COOKIE = 'session_id';
const CSRF_COOKIE = 'csrf_token';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);
  private readonly secure: boolean;
  private readonly domain: string | undefined;

  constructor(
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
  ) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'DEV');
    this.secure = nodeEnv === 'production' || nodeEnv === 'testing';
    // Mismo dominio que usas en createCustomerSession
    this.domain = this.secure ? '.igaproductos.com' : undefined;
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isValid = await this.validateSession(req);
      if (!isValid && !res.locals.sessionCreated) {
        res.locals.sessionCreated = true;
        await this.createSession(res);
      }
    } catch (error) {
      this.logger.error('Session middleware failed', error instanceof Error ? error.stack : error);
      try {
        if (!res.locals.sessionCreated) {
          res.locals.sessionCreated = true;
          await this.createSession(res);
        }
      } catch {
        this.logger.warn('Emergency session creation also failed — continuing without session');
      }
    } finally {
      next();
    }
  }

  private async validateSession(req: Request): Promise<boolean> {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    const csrfToken = req.cookies?.[CSRF_COOKIE];
    if (typeof sessionId !== 'string' || typeof csrfToken !== 'string') return false;
    const cached = await this.cache.getData<{ csrfToken: string }>({
      entity: `session:${sessionId}`,
    });
    if (!cached?.csrfToken) return false;
    return this.timingSafeCompare(cached.csrfToken, csrfToken);
  }

  private async createSession(res: Response): Promise<void> {
    const sessionId = this.generateToken();
    const csrfToken = this.generateToken();
    await this.saveInCache(sessionId, csrfToken);

    const base: CookieOptions = {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',          // igual que createCustomerSession
      maxAge: SESSION_TTL_MS,
      path: '/',
      domain: this.domain,      // ← el fix: .igaproductos.com en prod
    };

    res.cookie(SESSION_COOKIE, sessionId, base);
    res.cookie(CSRF_COOKIE, csrfToken, { ...base, httpOnly: false });
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const lenA = Buffer.byteLength(a);
    const lenB = Buffer.byteLength(b);
    const maxLen = Math.max(lenA, lenB);
    const bufA = Buffer.alloc(maxLen);
    const bufB = Buffer.alloc(maxLen);
    bufA.write(a);
    bufB.write(b);
    return require('crypto').timingSafeEqual(bufA, bufB) && lenA === lenB;
  }

  private async saveInCache(sessionId: string, csrfToken: string): Promise<void> {
    await this.cache.setData<{ sessionId: string; csrfToken: string }>({
      entity: `session:${sessionId}`,
      data: { sessionId, csrfToken },
      aditionalOptions: { ttlMilliseconds: SESSION_TTL_MS },
    });
  }
}