import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, ValidateNested } from "class-validator";


export class IgaEcommerceCarouselDTO {
    @ApiProperty({ description: "Indice de la imagen" })
    @IsInt()
    @IsNotEmpty()
    index: number;

    @ApiProperty({ description: "Url de la imagen" })
    @IsString()
    @IsNotEmpty()
    url: string;
};


export class IgaEcommerceVideosDTO {
    @ApiProperty({ description: "Indice de la imagen" })
    @IsInt()
    @IsNotEmpty()
    index: number;

    @ApiProperty({ description: "Url de la imagen" })
    @IsString()
    @IsNotEmpty()
    url: string;

    @ApiProperty({ description: "Titulo de la imagen" })
    @IsString()
    @IsNotEmpty()
    title: string;
};

export class IgaEcommerceBannerDTO {
    @ApiProperty({ description: "Titulo de la imagen" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: "Descripcion de la imagen" })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: "Url de la imagen" })
    @IsString()
    @IsNotEmpty()
    imageUrl: string;

    @ApiProperty({ description: "Descripcion del boton" })
    @IsString()
    @IsNotEmpty()
    buttonDescription: string;

    @ApiProperty({ description: "Url del boton" })
    @IsString()
    @IsNotEmpty()
    buttonUrl: string;

    @ApiProperty({ description: "Tamaño de la imagen" })
    @IsString()
    @IsNotEmpty()
    imageSize: string;
};

export class IgaEcommerceBannerTagsDTO {
    @ApiProperty({ description: "Descripcion del tag" })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: "Indice del tag" })
    @IsInt()
    @IsNotEmpty()
    index: number;
};

export class IgaEcommerceBannerAttributesDTO {
    @ApiProperty({ description: "Descripcion del atributo" })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: "Indice del atributo" })
    @IsInt()
    @IsNotEmpty()
    index: number;
};

export class IgaEcommerceInfoBannerDTO {
    @ApiProperty({ description: "Titulo de la imagen" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: "Subtitulo de la imagen" })
    @IsString()
    @IsNotEmpty()
    subtitle: string;

    @ApiProperty({ description: "Tags de la imagen" })
    @Type(() => IgaEcommerceBannerTagsDTO)
    @ValidateNested({ each: true })
    tags: IgaEcommerceBannerTagsDTO[];

    @ApiProperty({ description: "Url de la imagen" })
    @IsString()
    @IsNotEmpty()
    imageUrl: string;

    @ApiProperty({ description: "Atributos de la imagen" })
    @Type(() => IgaEcommerceBannerAttributesDTO)
    @ValidateNested({ each: true })
    attributes: IgaEcommerceBannerAttributesDTO[];

    @ApiProperty({ description: "Descripcion del boton" })
    @IsString()
    @IsNotEmpty()
    buttonDescription: string;

    @ApiProperty({ description: "Url del boton" })
    @IsString()
    @IsNotEmpty()
    buttonUrl: string;
};