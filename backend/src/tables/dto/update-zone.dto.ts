import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { ZoneStatus } from "../entities/zone.entity"

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string

  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus
}
