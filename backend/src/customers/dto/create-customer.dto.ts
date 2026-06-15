import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreateCustomerDto {
  @ApiProperty({ description: "Họ và tên khách hàng", example: "Nguyễn Văn A" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string

  @ApiProperty({ description: "Số điện thoại (unique)", example: "0901234567" })
  @IsString()
  @Matches(/^(0|\+84)\d{9,10}$/, { message: "Số điện thoại không hợp lệ" })
  phone: string

  @ApiPropertyOptional({ description: "Email khách hàng" })
  @IsOptional()
  @IsEmail({}, { message: "Email không hợp lệ" })
  @MaxLength(100)
  email?: string

  @ApiPropertyOptional({ description: "Ghi chú nội bộ" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
