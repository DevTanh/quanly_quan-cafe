import { IsOptional, IsString, IsEnum, IsInt, Min } from "class-validator"
import { Type } from "class-transformer"
import { PaymentMethod, PaymentStatus } from "../entities/payment.entity"

export class QueryPaymentDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}
