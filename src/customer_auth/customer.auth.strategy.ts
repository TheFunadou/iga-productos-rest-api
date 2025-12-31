import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, "jwt-customer") {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.["iga_customer_access_token"]; //Extract JWT from cookies
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_CUSTOMER_SECRET,
        });
    }

    async validate(payload) { return payload; };
}