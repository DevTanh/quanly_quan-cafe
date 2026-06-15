import { IsEnum } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { OrderItemStatus } from "../entities/order-item.entity"

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    enum: OrderItemStatus,
    description: "Trạng thái mới của món: sent (đã gửi bar) hoặc done (đã hoàn thành)",
    example: OrderItemStatus.DONE,
  })
  @IsEnum(OrderItemStatus, {
    message: `status phải là một trong: ${Object.values(OrderItemStatus).join(", ")}`,
  })
  status: OrderItemStatus
}
