import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"

export class CreateStockCheckItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualStock: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string
}

export class CreateStockCheckDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  checkerName: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockCheckItemDto)
  items: CreateStockCheckItemDto[]
}
