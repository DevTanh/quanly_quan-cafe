import { BadRequestException } from "@nestjs/common"
import { OrdersService } from "./orders.service"
import { Order, OrderStatus } from "../entities/order.entity"
import { Payment, PaymentMethod, PaymentStatus } from "../entities/payment.entity"
import { ProductStatus } from "../../products/entities/product.entity"

describe("OrdersService table validation", () => {
  let service: OrdersService
  let ordersRepo: {
    findOpenByTable: jest.Mock
    create: jest.Mock
    findById: jest.Mock
    findByQuery: jest.Mock
    update: jest.Mock
  }
  let orderItemsRepo: {
    createMany: jest.Mock
    deleteByOrderId: jest.Mock
  }
  let paymentsRepo: {
    findByOrderId: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  let productsRepo: {
    findById: jest.Mock
  }
  let tablesService: {
    findActiveTableById: jest.Mock
  }
  let payosService: {
    getPaymentLink: jest.Mock
  }
  let queryRunner: {
    connect: jest.Mock
    startTransaction: jest.Mock
    commitTransaction: jest.Mock
    rollbackTransaction: jest.Mock
    release: jest.Mock
    manager: {
      update: jest.Mock
      findOne: jest.Mock
      createQueryBuilder: jest.Mock
    }
  }
  let dataSource: {
    createQueryRunner: jest.Mock
  }

  beforeEach(() => {
    ordersRepo = {
      findOpenByTable: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByQuery: jest.fn(),
      update: jest.fn(),
    }
    orderItemsRepo = {
      createMany: jest.fn(),
      deleteByOrderId: jest.fn(),
    }
    paymentsRepo = {
      findByOrderId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    productsRepo = {
      findById: jest.fn(),
    }
    tablesService = {
      findActiveTableById: jest.fn(),
    }
    payosService = {
      getPaymentLink: jest.fn(),
    }
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        update: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        })),
      },
    }
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    }

    service = new (OrdersService as any)(
      ordersRepo,
      orderItemsRepo,
      paymentsRepo,
      productsRepo,
      payosService,
      {},
      dataSource,
      tablesService,
    ) as OrdersService
  })

  function mockCreateOrderSuccess(tableId: number) {
    const createdOrder = {
      id: 99,
      tableId,
      status: OrderStatus.PENDING,
      subtotal: 20000,
      version: 1,
    }

    ordersRepo.findOpenByTable.mockResolvedValue(null)
    ordersRepo.create.mockResolvedValue(createdOrder)
    ordersRepo.findById.mockResolvedValue({
      ...createdOrder,
      items: [],
    })
    productsRepo.findById.mockResolvedValue({
      id: 1,
      name: "Ca phe",
      sellingPrice: 20000,
      status: ProductStatus.ACTIVE,
    })
    orderItemsRepo.createMany.mockResolvedValue(undefined)
  }

  it("rejects creating an order for an inactive table", async () => {
    tablesService.findActiveTableById.mockResolvedValue(null)
    mockCreateOrderSuccess(10)

    await expect(
      service.create(
        {
          tableId: 10,
          items: [{ productId: 1, quantity: 1 }],
        },
        1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(productsRepo.findById).not.toHaveBeenCalled()
    expect(ordersRepo.create).not.toHaveBeenCalled()
  })

  it("allows tableId 0 for non-table orders", async () => {
    mockCreateOrderSuccess(0)

    await expect(
      service.create(
        {
          tableId: 0,
          items: [{ productId: 1, quantity: 1 }],
        },
        1,
      ),
    ).resolves.toMatchObject({
      id: 99,
      tableId: 0,
      status: OrderStatus.PENDING,
    })
    expect(tablesService.findActiveTableById).not.toHaveBeenCalled()
    expect(ordersRepo.create).toHaveBeenCalled()
  })

  it("syncs a paid PayOS payment when checking payment status", async () => {
    const payment = {
      id: 7,
      orderId: 101,
      method: PaymentMethod.PAYOS_QR,
      paymentStatus: PaymentStatus.PENDING,
      paymentLinkId: "pl_101",
      amount: 85000,
    }
    const order = {
      id: 101,
      status: OrderStatus.PROCESSING,
      items: [
        {
          productId: 1,
          productName: "Ca phe",
          quantity: 1,
          status: "sent",
        },
      ],
    }

    paymentsRepo.findByOrderId
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({
        ...payment,
        paymentStatus: PaymentStatus.PAID,
        receivedAmount: 85000,
      })
    payosService.getPaymentLink.mockResolvedValue({
      code: "00",
      data: {
        orderCode: 101,
        amount: 85000,
        amountPaid: 85000,
        status: "PAID",
      },
    })
    ordersRepo.findById
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({
        ...order,
        status: OrderStatus.COMPLETED,
      })
    queryRunner.manager.findOne.mockResolvedValue({ id: 1, stock: 10 })

    const result = await service.getPaymentStatus(101)

    expect(payosService.getPaymentLink).toHaveBeenCalledWith("pl_101")
    expect(queryRunner.manager.update).toHaveBeenCalledWith(
      Payment,
      7,
      expect.objectContaining({
        paymentStatus: PaymentStatus.PAID,
        receivedAmount: 85000,
      }),
    )
    expect(queryRunner.manager.update).toHaveBeenCalledWith(Order, 101, {
      status: OrderStatus.COMPLETED,
    })
    expect(result).toMatchObject({
      orderId: 101,
      paymentStatus: PaymentStatus.PAID,
      method: PaymentMethod.PAYOS_QR,
    })
  })

  it("returns completed payment when paying an order with a pending QR already paid in PayOS", async () => {
    const payment = {
      id: 7,
      orderId: 101,
      method: PaymentMethod.PAYOS_QR,
      paymentStatus: PaymentStatus.PENDING,
      paymentLinkId: "pl_101",
      amount: 85000,
    }
    const order = {
      id: 101,
      status: OrderStatus.PROCESSING,
      subtotal: 85000,
      items: [
        {
          productId: 1,
          productName: "Ca phe",
          quantity: 1,
          status: "sent",
        },
      ],
    }
    const completedOrder = {
      ...order,
      status: OrderStatus.COMPLETED,
    }
    const paidPayment = {
      ...payment,
      paymentStatus: PaymentStatus.PAID,
      receivedAmount: 85000,
    }

    ordersRepo.findById
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(completedOrder)
    paymentsRepo.findByOrderId
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(paidPayment)
    payosService.getPaymentLink.mockResolvedValue({
      code: "00",
      data: {
        orderCode: 101,
        amount: 85000,
        amountPaid: 85000,
        status: "PAID",
      },
    })
    queryRunner.manager.findOne.mockResolvedValue({ id: 1, stock: 10 })

    await expect(
      service.pay(101, { method: PaymentMethod.PAYOS_QR }, 1),
    ).resolves.toMatchObject({
      payment: { paymentStatus: PaymentStatus.PAID },
      order: { status: OrderStatus.COMPLETED },
    })
  })
})
