import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CustomerAddress {
    @ApiProperty({ example: 1, description: "ID de registro" })
    id: string;

    @ApiProperty({ example: "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6", description: "UUID de la dirección" })
    uuid: string

    @ApiProperty({ example: 1, description: "ID del cliente" })
    customer_id: string;

    @ApiProperty({ example: "Yon", description: "Nombre del destinatario" })
    @IsString()
    @IsNotEmpty({ message: "El campo recipient_name (nombre del remitente) no puede estar vacio" })
    recipient_name: string;

    @ApiProperty({ example: "Sina", description: "Apellidos del destinatario" })
    @IsString()
    @IsNotEmpty({ message: "El campo recipient_last_name (apellidos del remitente) no puede estar vacio" })
    recipient_last_name: string;

    @ApiProperty({ example: "México", description: "Pais" })
    @IsString()
    @IsNotEmpty({ message: "El campo country (País) no puede estar vacio" })
    country: string;

    @ApiProperty({ example: "Veracruz", description: "Estado" })
    @IsString()
    @IsNotEmpty({ message: "El campo state (estado) no puede estar vacio" })
    state: string;

    @ApiProperty({ example: "Coatzacoalcos", description: "Localidad" })
    @IsString()
    @IsNotEmpty({ message: "El campo locality (localidad) no puede estar vacio" })
    locality: string;

    @ApiProperty({ example: "Coatzacoalcos", description: "Ciudad o locación" })
    @IsString()
    @IsNotEmpty({ message: "El campo city (ciudad) no puede estar vacio" })
    city: string;

    @ApiProperty({ example: "Calle #12", description: "Nombre de la calle" })
    @IsString()
    @IsNotEmpty({ message: "El campo street_name (calle) no puede estar vacio" })
    street_name: string;

    @ApiProperty({ example: "Colonia #12", description: "Colonia, barrio, etc." })
    @IsString()
    @IsNotEmpty({ message: "El campo neighborhood (colonia/barrio) no puede estar vacio" })
    neighborhood: string;

    @ApiProperty({ example: "96230", description: "Codigo postal" })
    @IsString()
    @IsNumberString()
    @IsNotEmpty({ message: "El campo zip_code (código postal) no puede estar vacio" })
    zip_code: string;

    @ApiProperty({ example: "Casa", description: "Tipo de dirección (Casa,oficina,departamento,etc.)" })
    @IsString()
    @IsNotEmpty({ message: "El tipo de dirección no puede estar vacio" })
    address_type: string;

    @ApiProperty({ description: "Numero de piso (si es departamento)", default: "N/A" })
    @IsString()
    @IsNumberString()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === "") return "N/A";
    }, { toClassOnly: true })
    floor?: string | null;

    @ApiProperty({ example: "23", description: "Numero exterior de casa/edificio" })
    @IsString()
    @IsNotEmpty({ message: "El campo number (numero de domicilio) no puede estar vacio" })
    @Transform(({ value }) => {
        const text: string = value;
        return text.trim();
    })
    number: string;

    @ApiProperty({ description: "Numero interior de casa/departamento", default: "N/A" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => {
        return value === null || value === undefined || value === "" ? "N/A" : value
    }, { toClassOnly: true })
    aditional_number?: string | null;

    @ApiProperty({ example: "Casa verde 2 pisos", description: "Descripcion de la casa, referencias de direccion, etc.", default: "N/A" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => {
        return value === null || value === undefined || value === "" ? "N/A" : value
    }, { toClassOnly: true })
    references_or_comments?: string | null;

    @ApiProperty({ description: "Código de pais telefonico" })
    @IsString()
    @IsNotEmpty({ message: "El código de pais no puede estar vacio" })
    country_phone_code: string

    @ApiProperty({ example: "+529225674509", description: "Numero telefonico del remitente" })
    @IsString()
    @Length(0, 15, { message: "The field aditional_number must be less than or equal to 12 characters" })
    @IsNotEmpty({ message: "El campo contact_number no puede estar vacio" })
    @Transform(({ value }) => {
        const text: string = value;
        return text.trim();
    })
    contact_number: string;

    @ApiProperty({ example: false, description: "Esta es la direccion principal?" })
    @IsBoolean()
    @IsNotEmpty({ message: "El campo default_address no puede estar vacio" })
    default_address: boolean;

    @ApiProperty({ description: "Fecha de creacion" })
    created_at: Date;

    @ApiProperty({ description: "Ultima actualizacion" })
    updated_at: Date;
};


export class CreateCustomerAddressDTO extends OmitType(CustomerAddress, ['id', 'customer_id', "uuid", "created_at", "updated_at"] as const) { };
export class SafeCustomerAddress extends OmitType(CustomerAddress, ["id", "customer_id", "created_at", "updated_at"] as const) { };
export class UpdateCustomerAddressDTO extends PartialType(OmitType(CustomerAddress, ["customer_id", "id"] as const)) { };


export class GetCustomerAddresses {
    @ApiProperty({ type: [SafeCustomerAddress] })
    @Type(() => SafeCustomerAddress)
    data: SafeCustomerAddress[];

    @ApiProperty({ example: 1 })
    totalRecords: number;

    @ApiProperty({ example: 1 })
    totalPages: number;
};