import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";


export class PaginationDTO {
    @ApiProperty({ example: 1, description: "Pagina actual", required: true })
    @IsInt()
    @Type(() => Number)
    page: number;

    @ApiProperty({ example: 10, description: "Cantidad de items por pagina", required: true })
    @IsInt()
    @Type(() => Number)
    limit: number;
};