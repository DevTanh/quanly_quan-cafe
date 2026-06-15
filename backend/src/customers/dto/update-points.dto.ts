import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"

export class UpdatePointsDto {
  @ApiProperty({
    description: "Số điểm cộng (+) hoặc trừ (-). Kết quả tổng điểm không được âm.",
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  delta: number

  @ApiPropertyOptional({ description: "Lý do điều chỉnh điểm" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string
}
