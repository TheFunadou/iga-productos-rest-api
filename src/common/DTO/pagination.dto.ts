import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";


export class PaginationDTO {
    @ApiProperty({ example: 1, description: "Pagina actual", required: true })
    @IsInt()
    page: number;
    @ApiProperty({ example: 10, description: "Cantidad de items por pagina", required: true })
    @IsInt()
    limit: number;
};