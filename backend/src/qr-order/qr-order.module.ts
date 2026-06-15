// Đặt tại: src/qr-order/qr-order.module.ts

import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

// ── Import đúng đường dẫn thật trong dự án ──────────────────────
import { Order } from "../orders/entities/order.entity"
import { OrderItem } from "../orders/entities/order-item.entity"
import { CafeTable } from "../tables/entities/cafe-table.entity"
import { Product } from "../products/entities/product.entity"

import { QrOrderController } from "./qr-order.controller"
import { QrOrderService } from "./services/qr-order.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, CafeTable, Product]),
  ],
  controllers: [QrOrderController],
  providers: [QrOrderService],
})
export class QrOrderModule { }