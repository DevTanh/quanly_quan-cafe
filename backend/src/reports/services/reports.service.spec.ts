import { ReportsService } from "./reports.service"
import { PaymentMethod } from "../../orders/entities/payment.entity"

describe("ReportsService", () => {
  let service: ReportsService
  let paymentsRepo: { createQueryBuilder: jest.Mock }
  let orderItemsRepo: { createQueryBuilder: jest.Mock }
  let productsRepo: { createQueryBuilder: jest.Mock }

  function queryBuilder(result: {
    rawOne?: Record<string, unknown>
    rawMany?: Record<string, unknown>[]
    count?: number
  }) {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(result.rawOne),
      getRawMany: jest.fn().mockResolvedValue(result.rawMany ?? []),
      getCount: jest.fn().mockResolvedValue(result.count ?? 0),
    }
  }

  beforeEach(() => {
    paymentsRepo = { createQueryBuilder: jest.fn() }
    orderItemsRepo = { createQueryBuilder: jest.fn() }
    productsRepo = { createQueryBuilder: jest.fn() }
    service = new ReportsService(
      paymentsRepo as any,
      orderItemsRepo as any,
      productsRepo as any,
    )
  })

  it("counts only paid payments as revenue", async () => {
    paymentsRepo.createQueryBuilder
      .mockReturnValueOnce(queryBuilder({
        rawOne: { revenue: "125000", paidOrders: "2" },
      }))
      .mockReturnValueOnce(queryBuilder({ rawMany: [] }))
    orderItemsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ rawMany: [] }))
    productsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ count: 0 }))

    const result = await service.getDashboard({
      from: "2026-06-01",
      to: "2026-06-07",
    })

    expect(result.revenue).toBe(125000)
    expect(result.paidOrders).toBe(2)
    expect(result.averageOrderValue).toBe(62500)
  })

  it("groups revenue by payment method", async () => {
    paymentsRepo.createQueryBuilder
      .mockReturnValueOnce(queryBuilder({
        rawOne: { revenue: "125000", paidOrders: "2" },
      }))
      .mockReturnValueOnce(queryBuilder({
        rawMany: [
          { method: PaymentMethod.CASH, amount: "75000", count: "1" },
          { method: PaymentMethod.BANK_TRANSFER, amount: "50000", count: "1" },
        ],
      }))
    orderItemsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ rawMany: [] }))
    productsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ count: 0 }))

    const result = await service.getDashboard({})

    expect(result.paymentMethods).toEqual([
      { method: PaymentMethod.CASH, amount: 75000, count: 1 },
      { method: PaymentMethod.BANK_TRANSFER, amount: 50000, count: 1 },
    ])
  })

  it("returns top products from paid orders", async () => {
    paymentsRepo.createQueryBuilder
      .mockReturnValueOnce(queryBuilder({
        rawOne: { revenue: "125000", paidOrders: "2" },
      }))
      .mockReturnValueOnce(queryBuilder({ rawMany: [] }))
    orderItemsRepo.createQueryBuilder.mockReturnValue(queryBuilder({
      rawMany: [
        { productId: "3", productName: "Bac xiu", quantity: "4", revenue: "100000" },
      ],
    }))
    productsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ count: 0 }))

    const result = await service.getDashboard({})

    expect(result.topProducts).toEqual([
      { productId: 3, productName: "Bac xiu", quantity: 4, revenue: 100000 },
    ])
  })

  it("returns low stock count from products table", async () => {
    paymentsRepo.createQueryBuilder
      .mockReturnValueOnce(queryBuilder({
        rawOne: { revenue: "0", paidOrders: "0" },
      }))
      .mockReturnValueOnce(queryBuilder({ rawMany: [] }))
    orderItemsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ rawMany: [] }))
    productsRepo.createQueryBuilder.mockReturnValue(queryBuilder({ count: 4 }))

    const result = await service.getDashboard({})

    expect(result.lowStockCount).toBe(4)
  })
})
