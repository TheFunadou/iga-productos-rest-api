import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export type Permissions = "CREATE" | "READ" | "UPDATE" | "DELETE";
export type Modules = "USERS" | "CATEGORIES" | "SUBCATEGORIES" | "PRODUCTS" | "CUSTOMERS" | "ORDERS" | "E_COMMERCE_PAGE" | "OFFERS" | "E_COMMERCE_METRICS";

/**
 * @description Enumeracion de modulos para los permisos de los usuarios
 * @see schema.prisma -> UserModules enum
 */
export interface UserPermissions {
    USERS?: Permissions[];
    CATEGORIES?: Permissions[];
    SUBCATEGORIES?: Permissions[];
    PRODUCTS?: Permissions[];
    CUSTOMERS?: Permissions[];
    ORDERS?: Permissions[];
    E_COMMERCE_PAGE?: Permissions[];
    OFFERS?: Permissions[];
    E_COMMERCE_METRICS?: Permissions[];
};


export class UserCredentialsDTO {
    @ApiProperty({ example: "user@example.com", description: "correo o username del usuario" })
    @IsString()
    email_or_username: string;

    @ApiProperty({ example: "password", description: "contraseña del usuario" })
    @IsString()
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    password: string;
};

export class UserPayload {
    @ApiProperty({ description: "UUID del usuario", type: String })
    uuid: string;

    @ApiProperty({ description: "Nombre del usuario", type: String })
    name: string;

    @ApiProperty({ description: "Apellido del usuario", type: String })
    last_name: string;

    @ApiProperty({ description: "Correo del usuario", type: String })
    email: string;

    @ApiProperty({ description: "Rol del usuario", type: String })
    role: string;

    @ApiProperty({ description: "Permisos del usuario" })
    permissions: UserPermissions;
};


export class AuthUser {
    @ApiProperty({ description: "Payload del usuario", type: UserPayload })
    payload: UserPayload;
};


export class AuthUserPermissions {
    @ApiProperty({ description: "Rol del usuario", type: String })
    role: string;

    @ApiProperty({ description: "Permisos del usuario" })
    permissions: UserPermissions;
}
