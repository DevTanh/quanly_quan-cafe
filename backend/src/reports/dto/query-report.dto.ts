import { IsOptional, IsString } from "class-validator"

export class QueryReportDto {
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
