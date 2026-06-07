import { BadRequestException } from "@nestjs/common"
import { OrdersService } from "./orders.service"
import { OrderStatus } from "../entities/order.entity"
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

    service = new (OrdersService as any)(
      ordersRepo,
      orderItemsRepo,
      paymentsRepo,
      productsRepo,
      {},
      {},
      {},
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
})
