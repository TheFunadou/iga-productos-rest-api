import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CookieOptions, Request, Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/cache.service';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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
    this.domain = this.secure ? '.igaproductos.com' : undefined;
  };

  private getCookieNames(req: Request) {
    const origin = req.headers.origin || req.headers.referer || "";

    // Si el origen contiene 'adminpanel', usamos los nombres de admin
    if (origin.includes('adminpanel') || origin.includes('localhost:5173')) {
      return {
        session: 'iga_user_session_id',
        csrf: 'iga_user_csrf_token'
      };
    }
    // Por defecto (e-commerce)
    return {
      session: 'session_id',
      csrf: 'csrf_token'
    };
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const cookies = this.getCookieNames(req);
    res.locals.cookieNames = cookies;
    try {
      const isValid = await this.validateSession(req, cookies);
      if (!isValid && !res.locals.sessionCreated) {
        res.locals.sessionCreated = true;
        await this.createSession(res, cookies);
      }
    } catch (error) {
      this.logger.error('Session middleware failed', error instanceof Error ? error.stack : error);
      try {
        if (!res.locals.sessionCreated) {
          res.locals.sessionCreated = true;
          await this.createSession(res, cookies);
        }
      } catch {
        this.logger.warn('Emergency session creation also failed — continuing without session');
      }
    } finally {
      next();
    }
  }

  private async validateSession(req: Request, names: { session: string, csrf: string }): Promise<boolean> {
    const sessionId = req.cookies?.[names.session];
    const csrfToken = req.cookies?.[names.csrf];
    if (typeof sessionId !== 'string' || typeof csrfToken !== 'string') return false;
    const cached = await this.cache.getData<{ csrfToken: string }>({
      entity: `session:${sessionId}`,
    });
    if (!cached?.csrfToken) return false;
    return this.timingSafeCompare(cached.csrfToken, csrfToken);
  }

  private async createSession(res: Response, names: { session: string, csrf: string }): Promise<void> {

    const sessionId = this.generateToken();
    const csrfToken = this.generateToken();
    await this.saveInCache(sessionId, csrfToken);

    const base: CookieOptions = {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: '/',
      domain: this.domain,
    };

    res.cookie(names.session, sessionId, base);
    res.cookie(names.csrf, csrfToken, { ...base, httpOnly: false });
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