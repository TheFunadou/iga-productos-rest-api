import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";


export class CustomerCredentialsDTO {
    @ApiProperty({ example: "user@example.com", description: "correo o username del cliente" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password", description: "contraseña del cliente" })
    @IsNotEmpty({ message: "La contraseña no puede estar vacia" })
    password: string;
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
};


export class AuthCustomer {
    @ApiProperty({ description: "Payload del client", type: CustomerPayload })
    payload: CustomerPayload;

    @ApiProperty({ description: "Token de seguridad", type: String })
    csrfToken: string;
};


