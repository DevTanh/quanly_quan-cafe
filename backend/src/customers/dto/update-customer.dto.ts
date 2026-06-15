import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsBoolean,
} from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(0|\+84)\d{9,10}$/, { message: "Số điện thoại không hợp lệ" })
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: "Email không hợp lệ" })
  @MaxLength(100)
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
