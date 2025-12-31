import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { UserRoles } from "generated/prisma/enums";
import { type Modules, type Permissions } from "src/user_auth/user_auth.dto";

export class User {

    @ApiProperty({ example: "id", description: "Id del usuario" })
    id: string;

    @ApiProperty({ example: "uuid", description: "UUID del usuario" })
    uuid: string;

    @ApiProperty({ example: "name", description: "Nombre del usuario" })
    @IsString()
    name: string;

    @ApiProperty({ example: "last_name", description: "Apellido del usuario" })
    @IsString()
    last_name: string;

    @ApiProperty({ example: "username", description: "Nombre de usuario" })
    @IsString()
    username: string;

    @ApiProperty({ example: "user@example.com", description: "Email del usuario" })
    @IsString()
    email: string;

    @ApiProperty({ example: "STAFF", description: "Rol del usuario" })
    @IsString()
    role: UserRoles;

    @ApiProperty({ example: "2025-12-16T13:22:58.000Z", description: "Fecha de creación del usuario" })
    created_at: Date;

    @ApiProperty({ example: "2025-12-16T13:22:58.000Z", description: "Fecha de actualización del usuario" })
    updated_at: Date;

    @ApiProperty({ example: "image", description: "Imagen del usuario" })
    @IsString()
    @IsOptional()
    image?: string;
};

class UserDataDTO extends OmitType(User, ["id", "uuid", "created_at", "updated_at"] as const) { };
class UserPermissionsDTO {
    @ApiProperty({ example: "PRODUCTS", description: "Modulo de acceso del usuario" })
    @IsString()
    module: Modules;

    @ApiProperty({ example: ["CREATE", "READ", "UPDATE", "DELETE"], description: "Permisos del usuario" })
    @IsArray()
    permissions: Permissions[];
};

export class CreateUserDTO extends UserDataDTO {
    @ApiProperty({ example: "password123", description: "Contraseña del usuario" })
    @IsString()
    password: string;

    @ApiProperty({ example: [{ module: "PRODUCTS", permissions: ["CREATE", "READ", "UPDATE", "DELETE"] }], description: "Permisos del usuario" })
    @IsArray()
    @ValidateNested()
    @IsOptional()
    @Type(() => UserPermissionsDTO)
    permissions?: UserPermissionsDTO[]
};