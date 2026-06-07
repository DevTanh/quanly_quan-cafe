import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Order } from "./entities/order.entity"
import { OrderItem } from "./entities/order-item.entity"
import { Payment } from "./entities/payment.entity"
import { OrdersRepository } from "./repositories/orders.repository"
import { OrderItemsRepository } from "./repositories/order-items.repository"
import { PaymentsRepository } from "./repositories/payments.repository"
import { OrdersService } from "./services/orders.service"
import { PayosService } from "./services/payos.service"
import { OrdersController } from "./orders.controller"
import { PaymentsWebhookController } from "./payments-webhook.controller"
import { ProductsModule } from "../products/products.module"
import { TablesModule } from "../tables/tables.module"

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment]),
    ProductsModule,
    TablesModule,
  ],
  controllers: [OrdersController, PaymentsWebhookController],
  providers: [
    OrdersRepository,
    OrderItemsRepository,
    PaymentsRepository,
    OrdersService,
    PayosService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
