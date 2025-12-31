import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, "jwt-user") {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.["iga_user_access_token"]; //Extract JWT from cookies
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_USER_SECRET,
        });
    }

    async validate(payload) { return payload; };
}