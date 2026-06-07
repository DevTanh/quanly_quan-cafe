import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { StockCheck } from "../entities/stock-check.entity"
import { StockCheckItem } from "../entities/stock-check-item.entity"
import type { QueryStockCheckDto } from "../dto/query-stock-check.dto"

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

@Injectable()
export class StockChecksRepository {
  constructor(
    @InjectRepository(StockCheck)
    private readonly repo: Repository<StockCheck>,
    @InjectRepository(StockCheckItem)
    private readonly itemRepo: Repository<StockCheckItem>,
  ) {}

  async getNextCode(): Promise<string> {
    const result = await this.repo
      .createQueryBuilder("stockCheck")
      .select("stockCheck.code")
      .where("stockCheck.code LIKE :prefix", { prefix: "KC%" })
      .orderBy("stockCheck.code", "DESC")
      .limit(1)
      .getOne()

    if (!result) return "KC000001"
    const num = parseInt(result.code.replace("KC", ""), 10)
    return `KC${String(num + 1).padStart(6, "0")}`
  }

  async createWithItems(
    data: Partial<StockCheck>,
    items: Partial<StockCheckItem>[],
  ): Promise<StockCheck> {
    const stockCheck = await this.repo.save(this.repo.create(data))
    const itemEntities = items.map((item) =>
      this.itemRepo.create({
        ...item,
        stockCheckId: stockCheck.id,
      }),
    )
    await this.itemRepo.save(itemEntities)
    return (await this.findById(stockCheck.id))!
  }

  async findByQuery(query: QueryStockCheckDto): Promise<PaginatedResult<StockCheck>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

    const qb = this.repo
      .createQueryBuilder("stockCheck")
      .leftJoinAndSelect("stockCheck.items", "items")
      .orderBy("stockCheck.createdAt", "DESC")
      .addOrderBy("items.id", "ASC")

    if (query.from) {
      qb.andWhere("stockCheck.created_at >= :from", { from: query.from })
    }
    if (query.to) {
      qb.andWhere("stockCheck.created_at <= :to", { to: `${query.to} 23:59:59` })
    }

    const total = await qb.getCount()
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(id: number): Promise<StockCheck | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["items"],
    })
  }
}
