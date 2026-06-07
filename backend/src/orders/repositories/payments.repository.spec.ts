import { PaymentsRepository } from "./payments.repository"
import { PaymentMethod, PaymentStatus } from "../entities/payment.entity"

describe("PaymentsRepository.findByQuery", () => {
  let repository: PaymentsRepository
  let ormRepo: { createQueryBuilder: jest.Mock }
  let qb: {
    leftJoinAndSelect: jest.Mock
    andWhere: jest.Mock
    orderBy: jest.Mock
    skip: jest.Mock
    take: jest.Mock
    getCount: jest.Mock
    getMany: jest.Mock
  }

  beforeEach(() => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([{ id: 1, orderId: 12 }]),
    }
    ormRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    }

    repository = new PaymentsRepository(ormRepo as any)
  })

  it("returns paid payments filtered by date range", async () => {
    const result = await repository.findByQuery({
      from: "2026-06-01",
      to: "2026-06-07",
    })

    expect(qb.andWhere).toHaveBeenCalledWith("p.paid_at >= :from", {
      from: new Date("2026-06-01T00:00:00.000Z"),
    })
    expect(qb.andWhere).toHaveBeenCalledWith("p.paid_at <= :to", {
      to: new Date("2026-06-07T23:59:59.999Z"),
    })
    expect(result).toMatchObject({
      data: [{ id: 1, orderId: 12, invoiceCode: "HD000012" }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
  })

  it("filters by payment method", async () => {
    await repository.findByQuery({ method: PaymentMethod.CASH })

    expect(qb.andWhere).toHaveBeenCalledWith("p.method = :method", {
      method: PaymentMethod.CASH,
    })
  })

  it("filters by payment status", async () => {
    await repository.findByQuery({ status: PaymentStatus.PAID })

    expect(qb.andWhere).toHaveBeenCalledWith("p.payment_status = :status", {
      status: PaymentStatus.PAID,
    })
  })

  it("searches by order id using invoice code format", async () => {
    await repository.findByQuery({ search: "HD000012" })

    expect(qb.andWhere).toHaveBeenCalledWith("p.order_id = :orderId", {
      orderId: 12,
    })
  })
})
