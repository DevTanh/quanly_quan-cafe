import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StockCheck } from "./entities/stock-check.entity"
import { StockCheckItem } from "./entities/stock-check-item.entity"
import { Product } from "../products/entities/product.entity"
import { StockChecksRepository } from "./repositories/stock-checks.repository"
import { InventoryService } from "./services/inventory.service"
import { InventoryController } from "./inventory.controller"

@Module({
  imports: [TypeOrmModule.forFeature([StockCheck, StockCheckItem, Product])],
  controllers: [InventoryController],
  providers: [StockChecksRepository, InventoryService],
})
export class InventoryModule {}
