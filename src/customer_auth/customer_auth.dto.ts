import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";


export class CustomerCredentialsDTO {
    @ApiProperty({ example: "user@example.com", description: "correo o username del cliente" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password", description: "contraseña del cliente" })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    @IsString()
    password: string;

    @ApiProperty({ example: "recaptchaToken", description: "token de reCAPTCHA" })
    @IsNotEmpty({ message: "El token de reCAPTCHA no puede estar vacio" })
    @IsString()
    recaptchaToken: string;
};

export class CustomerPayload {
    @ApiProperty({ description: "UUID del cliente", type: String })
    uuid: string;

    @ApiProperty({ description: "Nombre del cliente", type: String })
    name: string;

    @ApiProperty({ description: "Apellido del cliente", type: String })
    last_name: string;

    @ApiProperty({ description: "Correo del cliente", type: String })
    email: string;

    @ApiProperty({ description: "Email validado?", type: String })
    verified: boolean;
};


export class AuthCustomer {
    @ApiProperty({ description: "Payload del client", type: CustomerPayload })
    payload: CustomerPayload;

    // @ApiProperty({ description: "Token de seguridad", type: String })
    // csrfToken: string;
};

export class GoogleAuthDTO {
    @ApiProperty({
        description: 'ID Token retornado por Google Sign-In desde el frontend',
        example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
    })
    @IsString()
    @IsNotEmpty({ message: 'El id_token de Google no puede estar vacío' })
    @Transform(({ value }) => value?.trim())
    id_token: string;
};

export class RestorePasswordPublicDTO {
    @ApiProperty({ example: "user@example.com", description: "correo o username del cliente" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password", description: "contraseña del cliente" })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    @IsString()
    newPassword: string;

    @ApiProperty({ example: "password", description: "contraseña del cliente" })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    @IsString()
    confirmNewPassword: string;

    @ApiProperty({ example: "restorePasswordToken", description: "token de restablecimiento de contraseña" })
    @IsNotEmpty({ message: "El token de restablecimiento de contraseña no puede estar vacio" })
    @IsString()
    restorePasswordToken: string;

    @ApiProperty({ example: "sessionId", description: "sessionId del cliente" })
    @IsNotEmpty({ message: "El sessionId del cliente no puede estar vacio" })
    @IsString()
    sessionId: string;
};

export class RestorePasswordAuthDTO extends RestorePasswordPublicDTO {
    @ApiProperty({ example: "password", description: "contraseña del cliente" })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    @IsString()
    oldPassword: string;
};