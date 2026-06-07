import { IsOptional, IsString } from "class-validator"

export class QueryZonesDto {
  @IsOptional()
  @IsString()
  include?: string
}
