import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";


export class PaginationDTO {
    @ApiProperty({ example: 1, description: "Pagina actual", required: false })
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    page?: number;

    @ApiProperty({ example: 10, description: "Cantidad de items por pagina", required: false })
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    limit?: number;

    @ApiProperty({ description: "Ordenamiento", required: false })
    @IsString()
    @IsOptional()
    orderBy?: "asc" | "desc";
};


export class DashboardCommonQueryDTO {
    @ApiProperty({ description: "UUID del target", required: false })
    @IsString()
    @IsOptional()
    target?: string;

    @ApiProperty({ description: "Pagina actual", required: false })
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    page?: number;

    @ApiProperty({ description: "Cantidad de items por pagina", required: false })
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    limit?: number;

    @ApiProperty({ description: "Ordenamiento", required: false })
    @IsString()
    @IsOptional()
    orderBy?: "asc" | "desc";
}