import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

export const USER_COOKIE_NAME = "iga_user_access_token";

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, "jwt-user") {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.[USER_COOKIE_NAME];
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_USER_SECRET,
        });
    }

    async validate(payload) { return payload; };
}