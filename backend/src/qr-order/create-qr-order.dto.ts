import {
  IsInt,
  IsPositive,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class QrOrderItemDto {
  @ApiProperty({ description: "ID sản phẩm", example: 3 })
  @Type(() => Number)
  @IsInt({ message: "productId phải là số nguyên" })
  @IsPositive({ message: "productId phải lớn hơn 0" })
  productId!: number // Thêm dấu ! ở đây

  @ApiProperty({ description: "Số lượng đặt", example: 2 })
  @Type(() => Number)
  @IsInt({ message: "quantity phải là số nguyên" })
  @Min(1, { message: "Số lượng tối thiểu là 1" })
  quantity!: number // Thêm dấu ! ở đây

  @ApiPropertyOptional({
    description: "Ghi chú cho món (ít đá, không đường...)",
    example: "Ít đường, nhiều đá",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Ghi chú tối đa 500 ký tự" })
  note?: string // Giữ nguyên dấu ? vì là optional
}

export class CreateQrOrderDto {
  @ApiProperty({ description: "ID bàn — lấy từ QR code trên bàn", example: 5 })
  @Type(() => Number)
  @IsInt({ message: "tableId phải là số nguyên" })
  @IsPositive({ message: "tableId phải lớn hơn 0" })
  tableId!: number // Thêm dấu ! ở đây

  @ApiProperty({
    description: "Danh sách món gọi — tối thiểu 1 món",
    type: () => [QrOrderItemDto],
  })
  @IsArray({ message: "items phải là mảng" })
  @ArrayMinSize(1, { message: "Phải chọn ít nhất 1 món" })
  @ValidateNested({ each: true })
  @Type(() => QrOrderItemDto)
  items!: QrOrderItemDto[] // Thêm dấu ! ở đây

  @ApiPropertyOptional({
    description: "Ghi chú chung cho cả đơn",
    example: "Mang lên nhanh giúp nhé",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string // Giữ nguyên dấu ? vì là optional
}