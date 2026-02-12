import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ProductReviews, ProductReviewsAttributes, ProductReviewsVersionAttributes } from "src/product/product.dto";


export class Customer {
    @ApiProperty({ example: 1, description: "Id del cliente" })
    id: string;

    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", description: "UUID del cliente" })
    @IsString()
    @IsNotEmpty({ message: "The uuid field cannot be empty" })
    @Type(() => String)
    uuid: string;

    @ApiProperty({ example: "Felipe", description: "Nombre del cliente" })
    @IsString()
    @IsNotEmpty({ message: "The name field cannot be empty" })
    name: string;

    @ApiProperty({ example: "Hernandez", description: "Apellidos del cliente" })
    @IsString()
    @IsNotEmpty({ message: "The last_name field cannot be empty" })
    last_name: string;

    @ApiProperty({ example: "felipe@correo.com", description: "Correo electronico del cliente" })
    @IsString()
    @IsEmail()
    @IsNotEmpty({ message: "The field email field cannot be empty" })
    email: string;

    @ApiProperty({ example: true, description: "¿Correo electronico verificado?" })
    @IsBoolean()
    @IsNotEmpty({ message: "The field email field cannot be empty" })
    email_verified: boolean;

    @ApiProperty({ example: "https://example.com/image.jpg", description: "Imagen del cliente" })
    @IsString()
    @IsOptional()
    image?: string | null;

    @ApiProperty({ example: "2025-10-02 ...", description: "Fecha de creación del cliente" })
    created_at: Date;

    @ApiProperty({ example: "2025-10-02 ...", description: "Fecha de ultima actualización" })
    updated_at: Date;
};


export class CustomerAccount {
    @ApiProperty({ description: "ID de la cuenta" })
    @IsString()
    @IsNotEmpty({ message: "The field id cannot be empty" })
    id: string;

    @ApiProperty({ description: "Id de la cuenta" })
    @IsString()
    @IsNotEmpty({ message: "The field account_id cannot be empty" })
    account_id: string;

    @ApiProperty({ description: "Id del proveedor" })
    @IsString()
    @IsNotEmpty({ message: "The field provider_id cannot be empty" })
    provider_id: string;

    @ApiProperty({ description: "Id del cliente" })
    @IsString()
    @IsNotEmpty({ message: "The field customer_id cannot be empty" })
    customer_id: string;

    @ApiProperty({ description: "Token de acceso" })
    @IsString()
    @IsNotEmpty({ message: "The field access_token cannot be empty" })
    access_token: string;

    @ApiProperty({ description: "Token de refresco" })
    @IsString()
    @IsNotEmpty({ message: "The field refresh_token cannot be empty" })
    refresh_token: string;

    @ApiProperty({ description: "Token de identificacion" })
    @IsString()
    @IsNotEmpty({ message: "The field id_token cannot be empty" })
    id_token: string;

    @ApiProperty({ description: "Fecha de expiracion del token de acceso" })
    @IsString()
    @IsNotEmpty({ message: "The field access_token_expires_at cannot be empty" })
    access_token_expires_at: string;

    @ApiProperty({ description: "Fecha de expiracion del token de refresco" })
    @IsString()
    @IsNotEmpty({ message: "The field refresh_token_expires_at cannot be empty" })
    refresh_token_expires_at: string;

    @ApiProperty({ description: "Scope del token" })
    @IsString()
    @IsNotEmpty({ message: "The field scope cannot be empty" })
    scope: string;

    @ApiProperty({ description: "Fecha de creación del token" })
    @IsString()
    @IsNotEmpty({ message: "The field created_at cannot be empty" })
    created_at: string;

    @ApiProperty({ description: "Fecha de ultima actualización del token" })
    @IsString()
    @IsNotEmpty({ message: "The field updated_at cannot be empty" })
    updated_at: string;
};


export class CustomerSession {
    @ApiProperty({ description: "Id" })
    id: string;

    @ApiProperty({ description: "Fecha de expiracion" })
    expires_at: string;

    @ApiProperty({ description: "Token" })
    token: string;

    @ApiProperty({ description: "Fecha de creación" })
    created_at: string;

    @ApiProperty({ description: "Fecha de ultima actualización" })
    updated_at: string;

    @ApiProperty({ description: "Dirección ip" })
    ip_address: string;

    @ApiProperty({ description: "Agente del usuario" })
    user_agent: string;

    @ApiProperty({ description: "Id del cliente" })
    customer_id: string;
};

export class SafeCustomer extends OmitType(Customer, ["id", "created_at", "updated_at"] as const) { };
// 
export class CustomerAttributes extends PickType(Customer, ["name", "last_name", "email"] as const) { };
export class CreateCustomerDTO extends CustomerAttributes {
    @ApiProperty({ description: "Contraseña del cliente" })
    @IsString()
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    password: string;

    @ApiProperty({ description: "Confirmacion de la contraseña" })
    @IsString()
    @IsNotEmpty({ message: "La confirmacion de la contraseña no puede estar vacia" })
    confirm_password: string;
};


export class UpdatePersonalDataDTO {
    @ApiProperty({ description: "Nombre del cliente" })
    @IsString()
    @IsNotEmpty({ message: "El nombre del cliente no puede estar vacio" })
    name: string;

    @ApiProperty({ description: "Apellidos del cliente" })
    @IsString()
    @IsNotEmpty({ message: "El apellido del cliente no puede estar vacio" })
    last_name: string;
};

export class UpdatePasswordDTO {
    @ApiProperty({ description: "Contraseña actual" })
    @IsString()
    @IsNotEmpty({ message: "La contraseña actual no puede estar vacia" })
    current_password: string;

    @ApiProperty({ description: "Contraseña nueva" })
    @IsString()
    @IsNotEmpty({ message: "La contraseña nueva no puede estar vacia" })
    new_password: string;
};

export class UpdateEmailDTO {
    @ApiProperty({ description: "Correo electronico" })
    @IsString()
    @IsNotEmpty({ message: "El correo electronico no puede estar vacio" })
    email: string;
};


export class CustomerReviewDTO extends ProductReviewsAttributes {
    @ApiProperty({ description: "SKU del producto" })
    @IsString()
    @IsNotEmpty({ message: "El sku no puede estar vacio" })
    sku: string;
};

export class GetCustomerReviews extends ProductReviewsAttributes {
    product_version: ProductReviewsVersionAttributes;
};

