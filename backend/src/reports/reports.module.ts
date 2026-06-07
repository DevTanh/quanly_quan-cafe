import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Payment } from "../orders/entities/payment.entity"
import { OrderItem } from "../orders/entities/order-item.entity"
import { Product } from "../products/entities/product.entity"
import { ReportsController } from "./reports.controller"
import { ReportsService } from "./services/reports.service"

@Module({
  imports: [TypeOrmModule.forFeature([Payment, OrderItem, Product])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
