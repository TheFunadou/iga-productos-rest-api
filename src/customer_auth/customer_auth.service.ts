import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthCustomer, CustomerCredentialsDTO, CustomerPayload, GoogleAuthDTO, RestorePasswordPublicDTO } from './customer_auth.dto';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'src/cache/cache.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { UpdateCustomerDTO } from 'src/customer/customer.dto';
import { Response as ExpressResponse } from 'express';


@Injectable()
export class CustomerAuthService {
    private readonly logger = new Logger(CustomerAuthService.name);
    private readonly jwtCustomerSecret?: string;
    private readonly nodeEnv: string;
    private readonly googleClientId?: string;
    private readonly recaptchaSecretKey?: string;
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly cache: CacheService,
        private readonly notifications: NotificationsService,
        private readonly config: ConfigService
    ) {
        this.jwtCustomerSecret = this.config.get<string>("JWT_CUSTOMER_SECRET");
        this.nodeEnv = this.config.get<string>("NODE_ENV", "DEV");
        this.googleClientId = this.config.get<string>("GOOGLE_CLIENT_ID");
        this.recaptchaSecretKey = this.config.get<string>("RECAPTCHA_SECRET_KEY");
    };

    private createCustomerSession({ res, authUser }: { res: ExpressResponse, authUser: CustomerPayload }) {
        const accessToken = this.jwt.sign(authUser, { secret: this.jwtCustomerSecret });
        const secure = this.nodeEnv === "production" || this.nodeEnv === "testing" ? true : false;
        const sameSite = "lax";
        const domain = this.nodeEnv === "production" || this.nodeEnv === "testing" ? ".igaproductos.com" : undefined;
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure,
            sameSite,
            domain,
            maxAge: 1000 * 60 * 60 * 24,
        });
    };

    async login({ res, dto }: { res: ExpressResponse, dto: CustomerCredentialsDTO }) {
        try {
            const isHuman = await this.validateRecaptcha(dto.recaptchaToken);
            if (!isHuman) throw new UnauthorizedException("Verificación de seguridad fallida. Eres un bot?");
            if (!this.jwtCustomerSecret) {
                if (this.nodeEnv === "DEV") this.logger.error("JWT_CUSTOMER_SECRET no se encontro en el archivo de variables de entorno");
                this.logger.error("Error al iniciar sesión");
                throw new BadRequestException("Ocurrio un error inesperado al iniciar sesión");
            };
            const authUser = await this.authentication(dto);
            this.createCustomerSession({ res, authUser });
            return { payload: authUser };
        } catch (error) {
            this.logger.error("Error al iniciar sesión");
            this.logger.error(error);
            throw new BadRequestException("Ocurrio un error inesperado al iniciar sesión");
        }
    };

    private async authentication(dto: CustomerCredentialsDTO) {
        const user = await this.prisma.customer.findFirst({
            where: { email: dto.email },
            select: {
                uuid: true,
                email: true,
                name: true,
                last_name: true,
                email_verified: true,
                accounts: { select: { password: true, } },
            }
        });

        if (!user) throw new NotFoundException("Correo no registrado");
        const passwordMatch = await bcrypt.compare(dto.password, user.accounts[0].password);
        if (!passwordMatch) throw new BadRequestException("Contraseña incorrecta");

        const payload: CustomerPayload = {
            uuid: user.uuid,
            email: user.email,
            name: user.name,
            last_name: user.last_name,
            verified: user.email_verified
        };
        return payload;
    };

    async getCsrfToken(args: { uuid: string }): Promise<string> {
        const data = await this.cache.getData<{ csrfToken: string }>({ entity: "customer:session:csrf", query: { customerUUID: args.uuid } });
        if (!data) throw new NotFoundException("No se encontro al usuario o no hay token guardado");
        return data.csrfToken;
    };

    async logout({ res, sessionId }: { res: ExpressResponse, sessionId: string }): Promise<void> {
        res.clearCookie("access_token");
        res.clearCookie("csrf_token");
        res.clearCookie("session_id");
        await this.cache.removeData({ entity: "session:csrf", query: { sessionId } });
    };

    async getProfile(args: { uuid: string }): Promise<AuthCustomer> {
        const customer = await this.prisma.customer.findUnique({
            where: { uuid: args.uuid },
            select: {
                uuid: true,
                email: true,
                name: true,
                last_name: true,
                email_verified: true
            }
        });
        if (!customer) throw new NotFoundException("Cliente no encontrado");
        const payload: CustomerPayload = {
            uuid: customer.uuid,
            email: customer.email,
            name: customer.name,
            last_name: customer.last_name,
            verified: customer.email_verified
        };
        return { payload };
    };

    async sendTokenToEmail({ sessionId, email, type }: { sessionId: string, email: string, type: "verification" | "restore-password" }): Promise<void> {
        const token = await this.generateVerificationToken({ sessionId, email, type }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al generar el token");
            throw new BadRequestException("Ocurrio un error inesperado al generar el token");
        });
        await this.notifications.sendTokenEmail({ token, to: email, type }).catch((error) => {
            if (this.nodeEnv === "DEV") this.logger.error(error);
            this.logger.error("Error al enviar el token");
            throw new BadRequestException("Ocurrio un error inesperado al enviar el token");
        });
    };

    async resendTokenToEmail({ sessionId, email, type }: { sessionId: string, email: string, type: "verification" | "restore-password" }): Promise<void> {
        const token = await this.cache.getData<string>({ entity: `register:${type}:token:${email}`, query: { sessionId } });
        if (!token) await this.sendTokenToEmail({ sessionId, email, type });
        await this.cache.invalidateQuery({ entity: `register:${type}:token:${email}`, query: { sessionId } });
        await this.sendTokenToEmail({ sessionId, email, type });
    };

    private async generateVerificationToken({ sessionId, email, type }: { sessionId: string, email: string, type: "verification" | "restore-password" }): Promise<string> {
        const ttl = type === "verification" ? 1000 * 60 * 5 : 1000 * 60 * 15;
        return await this.cache.remember<string>({
            method: "simpleFind",
            entity: `register:${type}:token:${email}`,
            query: { sessionId },
            aditionalOptions: {
                ttlMilliseconds: ttl,
                enabledJitter: false
            },
            fallback: async () => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                const token = Array.from(
                    { length: 8 },
                    () => chars[randomInt(chars.length)]
                ).join('');
                return token;
            }
        });
    };

    async validateToken({ token, sessionId, email, type }: { token: string, sessionId: string, email: string, type: "verification" | "restore-password" }): Promise<boolean> {
        const tokenInCache = await this.cache.getData<string>({ entity: `register:${type}:token:${email}`, query: { sessionId } });
        if (!tokenInCache) return false;
        if (tokenInCache !== token) return false;
        return true;
    };


    async loginWithGoogle({ res, dto }: { res: ExpressResponse, dto: GoogleAuthDTO }) {
        if (!this.googleClientId || !this.jwtCustomerSecret) {
            if (this.nodeEnv === "DEV") this.logger.error("GOOGLE_CLIENT_ID o JWT_CUSTOMER_SECRET no se encontro en el archivo de variables de entorno");
            this.logger.error("Error al iniciar sesión");
            throw new BadRequestException("Ocurrio un error inesperado al iniciar sesión");
        };
        const client = new OAuth2Client(this.googleClientId);

        let ticket: LoginTicket;
        try {
            ticket = await client.verifyIdToken({
                idToken: dto.id_token,
                audience: this.googleClientId,
            });
        } catch {
            throw new UnauthorizedException('Token de Google inválido o expirado');
        }

        const googlePayload = ticket.getPayload();
        if (!googlePayload || !googlePayload.email) {
            throw new BadRequestException('No se pudo obtener información del perfil de Google');
        }

        const { sub: googleId, email, given_name, family_name, picture } = googlePayload;

        // Buscar si ya existe cuenta vinculada a Google
        const existingAccount = await this.prisma.customerAccount.findUnique({
            where: { provider_id_account_id: { provider_id: 'google', account_id: googleId } },
            include: { customer: true },
        });

        if (existingAccount) {
            // Login normal — cliente ya autenticado con Google antes
            const customer = existingAccount.customer;
            const payload: CustomerPayload = {
                uuid: customer.uuid,
                email: customer.email,
                name: customer.name,
                last_name: customer.last_name,
                verified: customer.email_verified,
            };
            this.createCustomerSession({ res, authUser: payload });
            return { payload };
        }

        // Verificar si el email ya está registrado por flujo normal (credentials)
        const existingCustomerByEmail = await this.prisma.customer.findUnique({
            where: { email },
            include: { accounts: { where: { provider_id: 'credentials' } } },
        });

        if (existingCustomerByEmail) {
            // El email existe pero fue registrado con credentials — vincular cuenta de Google
            await this.prisma.customerAccount.create({
                data: {
                    provider_id: 'google',
                    account_id: googleId,
                    customer_id: existingCustomerByEmail.id,
                    id_token: dto.id_token,
                    scope: 'openid email profile',
                },
            });

            const payload: CustomerPayload = {
                uuid: existingCustomerByEmail.uuid,
                email: existingCustomerByEmail.email,
                name: existingCustomerByEmail.name,
                last_name: existingCustomerByEmail.last_name,
                verified: existingCustomerByEmail.email_verified,
            };
            this.createCustomerSession({ res, authUser: payload });
            return { payload };
        }

        const newCustomer = await this.prisma.customer.create({
            data: {
                name: given_name ?? 'Usuario',
                last_name: family_name ?? '',
                email,
                email_verified: true, // Google ya verificó el email
                image: picture,
                accounts: {
                    create: {
                        provider_id: 'google',
                        account_id: googleId,
                        id_token: dto.id_token,
                        scope: 'openid email profile',
                    },
                },
            },
        });

        const payload: CustomerPayload = {
            uuid: newCustomer.uuid,
            email: newCustomer.email,
            name: newCustomer.name,
            last_name: newCustomer.last_name,
            verified: newCustomer.email_verified,
        };
        this.createCustomerSession({ res, authUser: payload });
        return { payload };
    };


    private async validateRecaptcha(token: string): Promise<boolean> {
        if (!this.recaptchaSecretKey) {
            if (this.nodeEnv === "DEV") this.logger.error("RECAPTCHA_SECRET_KEY no se encontro en el archivo de variables de entorno");
            this.logger.error("Error al iniciar sesión");
            throw new BadRequestException("Ocurrio un error inesperado al iniciar sesión");
        };
        const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${this.recaptchaSecretKey}&response=${token}`
        }).catch(() => {
            if (this.nodeEnv === "DEV") this.logger.error("Error al validar reCAPTCHA");
            this.logger.error("Error al iniciar sesión");
            throw new BadRequestException("Ocurrio un error inesperado al iniciar sesión");
        });
        const data = await response.json();

        // reCAPTCHA v3 returns a "score" of 0.0 to 1.0 (where 1.0 is a good interaction, probably human)
        // Generally a score greater than 0.5 is considered safe.
        if (data.success && data.score >= 0.5) return true;
        return false;
    };

    async sendRestorePasswordTokenToEmail({ sessionId, email }: { sessionId: string, email: string }) {
        const customer = await this.prisma.customer.findUnique({ where: { email } });
        if (!customer) throw new BadRequestException("Este correo no se encuentra registrado en Iga Productos");
        await this.sendTokenToEmail({ email: customer.email, sessionId, type: "restore-password" });
    };

    async validateRestorePasswordToken({ token, sessionId, email }: { token: string, sessionId: string, email: string }) {
        return await this.validateToken({ token, sessionId, type: "restore-password", email });
    };

    async restorePasswordPublic({ dto: { email, newPassword, restorePasswordToken, sessionId, confirmNewPassword } }: { dto: RestorePasswordPublicDTO }) {
        const customer = await this.prisma.customer.findUnique({ where: { email }, select: { accounts: { select: { id: true, password: true } } } })
        if (!customer) throw new BadRequestException("Este correo no se encuentra registrado en Iga Productos");

        const isTokenValid = await this.validateToken({ token: restorePasswordToken, sessionId, type: "restore-password", email });
        if (!isTokenValid) throw new BadRequestException("El código de restablecimiento de contraseña no es válido. Ingreselo nuevamente");

        const passwordMatch: boolean = await bcrypt.compare(newPassword, customer.accounts[0].password);
        if (passwordMatch) throw new BadRequestException("La contraseña no puede ser la misma que la anterior");
        if (newPassword !== confirmNewPassword) throw new BadRequestException("Las nueva contraseña no coincide con la confirmación");
        const newHashedPassword = await bcrypt.hash(newPassword, 12);
        await this.prisma.customerAccount.update({
            where: { id: customer.accounts[0].id },
            data: { password: newHashedPassword }
        }).then(async () => {
            await this.cache.removeData({ entity: `register:restore-password:token:${email}`, query: { sessionId } });
        });
        return "Contraseña restablecida exitosamente";
    };

    async restorePasswordAuth({ dto, customerUUID }: { dto: UpdateCustomerDTO, customerUUID: string }) {
        const customer = await this.prisma.customer.findUnique({ where: { uuid: customerUUID }, select: { accounts: { select: { id: true, password: true } } } });
        if (!customer) throw new BadRequestException("Este correo no se encuentra registrado en Iga Productos");

        const passwordMatch: boolean = await bcrypt.compare(dto.current_password, customer.accounts[0].password);
        if (!passwordMatch) throw new BadRequestException("Contraseña incorrecta");

        const isTheSamePassword = await bcrypt.compare(dto.new_password, customer.accounts[0].password);
        if (isTheSamePassword) throw new BadRequestException("La contraseña no puede ser la misma que la anterior");
        if (dto.new_password !== dto.confirm_password) throw new BadRequestException("Las nueva contraseña no coincide con la confirmación");

        const newHashedPassword = await bcrypt.hash(dto.new_password, 12);
        await this.prisma.customerAccount.update({
            where: { id: customer.accounts[0].id },
            data: { password: newHashedPassword }
        });
        return "Contraseña restablecida exitosamente";
    }
};