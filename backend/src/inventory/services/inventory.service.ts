import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { DataSource } from "typeorm"
import { StockChecksRepository } from "../repositories/stock-checks.repository"
import { StockCheck } from "../entities/stock-check.entity"
import { StockCheckItem } from "../entities/stock-check-item.entity"
import { Product, ProductStatus } from "../../products/entities/product.entity"
import type { CreateStockCheckDto } from "../dto/create-stock-check.dto"
import type { QueryStockCheckDto } from "../dto/query-stock-check.dto"

@Injectable()
export class InventoryService {
  constructor(
    private readonly stockChecksRepo: StockChecksRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createStockCheck(dto: CreateStockCheckDto, checkedBy: number): Promise<StockCheck> {
    if (!dto.items.length) {
      throw new BadRequestException("Danh sach kiem kho khong duoc rong")
    }
    if (dto.items.some((item) => item.actualStock < 0)) {
      throw new BadRequestException("Ton thuc te khong duoc am")
    }

    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      const code = await this.stockChecksRepo.getNextCode()
      const itemSnapshots: Partial<StockCheckItem>[] = []

      for (const item of dto.items) {
        const product = await runner.manager.findOne(Product, {
          where: { id: item.productId },
          relations: ["category"],
        })
        if (!product) {
          throw new NotFoundException(`San pham #${item.productId} khong ton tai`)
        }

        const systemStock = Number(product.stock)
        const actualStock = item.actualStock
        itemSnapshots.push({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          categoryName: product.category?.name ?? "",
          systemStock,
          actualStock,
          diff: actualStock - systemStock,
          note: item.note,
        })
      }

      const stockCheck = runner.manager.create(StockCheck, {
        code,
        checkerName: dto.checkerName,
        checkedBy,
        totalItems: itemSnapshots.length,
        totalDiff: itemSnapshots.reduce((sum, item) => sum + Math.abs(item.diff ?? 0), 0),
      })
      const savedStockCheck = await runner.manager.save(StockCheck, stockCheck)

      const stockCheckItems = itemSnapshots.map((item) =>
        runner.manager.create(StockCheckItem, {
          ...item,
          stockCheckId: savedStockCheck.id,
        }),
      )
      const savedItems = await runner.manager.save(StockCheckItem, stockCheckItems)

      for (const item of itemSnapshots) {
        await runner.manager.update(Product, item.productId, {
          stock: item.actualStock,
        })
      }

      await runner.commitTransaction()
      return {
        ...savedStockCheck,
        items: savedItems,
      }
    } catch (err) {
      await runner.rollbackTransaction()
      throw err
    } finally {
      await runner.release()
    }
  }

  async findStockChecks(query: QueryStockCheckDto) {
    return await this.stockChecksRepo.findByQuery(query)
  }

  async findStockCheckById(id: number): Promise<StockCheck> {
    const stockCheck = await this.stockChecksRepo.findById(id)
    if (!stockCheck) throw new NotFoundException(`Phieu kiem kho #${id} khong ton tai`)
    return stockCheck
  }

  async findLowStock(): Promise<Product[]> {
    return await this.dataSource
      .getRepository(Product)
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "category")
      .where("p.status = :status", { status: ProductStatus.ACTIVE })
      .andWhere("p.stock <= p.min_stock")
      .orderBy("p.createdAt", "DESC")
      .getMany()
  }
}
