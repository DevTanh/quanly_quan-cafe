import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"
import { Type } from "class-transformer"

export class CreateTableDto {
  @Type(() => Number)
  @IsInt()
  zoneId: number

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string
}
