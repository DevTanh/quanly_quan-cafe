import { IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string
}
