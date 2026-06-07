import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"
import { Type } from "class-transformer"
import { TableStatus } from "../entities/cafe-table.entity"

export class UpdateTableDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zoneId?: number

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string

  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus
}
