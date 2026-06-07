import { BadRequestException } from "@nestjs/common"
import { InventoryService } from "./inventory.service"
import { StockCheck } from "../entities/stock-check.entity"
import { StockCheckItem } from "../entities/stock-check-item.entity"
import { Product, ProductStatus } from "../../products/entities/product.entity"

describe("InventoryService", () => {
  let service: InventoryService
  let stockChecksRepo: {
    getNextCode: jest.Mock
    findByQuery: jest.Mock
    findById: jest.Mock
  }
  let dataSource: {
    createQueryRunner: jest.Mock
    getRepository: jest.Mock
  }
  let runner: {
    connect: jest.Mock
    startTransaction: jest.Mock
    commitTransaction: jest.Mock
    rollbackTransaction: jest.Mock
    release: jest.Mock
    manager: {
      findOne: jest.Mock
      create: jest.Mock
      save: jest.Mock
      update: jest.Mock
    }
  }
  let lowStockQb: {
    leftJoinAndSelect: jest.Mock
    where: jest.Mock
    andWhere: jest.Mock
    orderBy: jest.Mock
    getMany: jest.Mock
  }

  beforeEach(() => {
    stockChecksRepo = {
      getNextCode: jest.fn().mockResolvedValue("KC000001"),
      findByQuery: jest.fn(),
      findById: jest.fn(),
    }

    runner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        create: jest.fn((entity, data) => ({ entity, ...data })),
        save: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    }

    lowStockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    }

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(runner),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(lowStockQb),
      }),
    }

    service = new InventoryService(stockChecksRepo as any, dataSource as any)
  })

  function mockProduct(product: Partial<Product> = {}) {
    return {
      id: 1,
      code: "SP000001",
      name: "Ca phe sua",
      stock: 13,
      status: ProductStatus.ACTIVE,
      category: { name: "Do uong" },
      ...product,
    }
  }

  it("creates a stock check and updates product stock in one transaction", async () => {
    runner.manager.findOne.mockResolvedValue(mockProduct())
    runner.manager.save.mockImplementation(async (entity, data) => {
      if (entity === StockCheck) {
        return {
          id: 1,
          ...data,
          createdAt: new Date("2026-06-07T06:30:00.000Z"),
        }
      }
      if (entity === StockCheckItem) {
        return data.map((item: any, index: number) => ({
          id: index + 1,
          ...item,
        }))
      }
      return data
    })

    const result = await service.createStockCheck(
      {
        checkerName: "Nguyen Van A",
        items: [{ productId: 1, actualStock: 15, note: "Lech sau ca sang" }],
      },
      7,
    )

    expect(runner.connect).toHaveBeenCalled()
    expect(runner.startTransaction).toHaveBeenCalled()
    expect(runner.manager.update).toHaveBeenCalledWith(Product, 1, { stock: 15 })
    expect(runner.commitTransaction).toHaveBeenCalled()
    expect(runner.rollbackTransaction).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      id: 1,
      code: "KC000001",
      checkerName: "Nguyen Van A",
      checkedBy: 7,
      totalItems: 1,
      totalDiff: 2,
      items: [
        {
          productId: 1,
          productCode: "SP000001",
          productName: "Ca phe sua",
          categoryName: "Do uong",
          systemStock: 13,
          actualStock: 15,
          diff: 2,
          note: "Lech sau ca sang",
        },
      ],
    })
  })

  it("rejects empty stock check items", async () => {
    await expect(
      service.createStockCheck({ checkerName: "Nguyen Van A", items: [] }, 7),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled()
  })

  it("rejects negative actual stock", async () => {
    await expect(
      service.createStockCheck(
        {
          checkerName: "Nguyen Van A",
          items: [{ productId: 1, actualStock: -1 }],
        },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled()
  })

  it("stores system stock snapshot before updating actual stock", async () => {
    runner.manager.findOne.mockResolvedValue(mockProduct({ stock: 8 }))
    runner.manager.save.mockImplementation(async (entity, data) => {
      if (entity === StockCheck) return { id: 2, ...data }
      if (entity === StockCheckItem) return data
      return data
    })

    const result = await service.createStockCheck(
      {
        checkerName: "Nguyen Van A",
        items: [{ productId: 1, actualStock: 5 }],
      },
      7,
    )

    expect(result.items[0]).toMatchObject({
      systemStock: 8,
      actualStock: 5,
      diff: -3,
    })
    expect(runner.manager.update).toHaveBeenCalledWith(Product, 1, { stock: 5 })
  })

  it("returns low-stock products where stock is less than or equal minStock", async () => {
    lowStockQb.getMany.mockResolvedValue([
      mockProduct({ id: 2, stock: 3, minStock: 3 }),
    ])

    const result = await service.findLowStock()

    expect(dataSource.getRepository).toHaveBeenCalledWith(Product)
    expect(lowStockQb.where).toHaveBeenCalledWith("p.status = :status", {
      status: ProductStatus.ACTIVE,
    })
    expect(lowStockQb.andWhere).toHaveBeenCalledWith("p.stock <= p.min_stock")
    expect(result).toHaveLength(1)
  })
})
