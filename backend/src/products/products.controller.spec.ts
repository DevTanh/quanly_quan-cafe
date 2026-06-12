import { ProductsController } from "./products.controller"
import { MenuType, ProductStatus } from "./entities/product.entity"

describe("ProductsController", () => {
  it("persists imported image URLs when creating products from Excel", async () => {
    const productsService = {}
    const excelService = {
      parseAndValidate: jest.fn().mockResolvedValue({
        valid: [
          {
            code: "SP000001",
            name: "Ca phe sua",
            menuType: MenuType.BEVERAGE,
            categoryId: 1,
            costPrice: 10000,
            sellingPrice: 25000,
            stock: 10,
            status: ProductStatus.ACTIVE,
            imageUrl: "https://cdn.example.com/ca-phe-sua.jpg",
          },
        ],
        errors: [],
      }),
    }
    const productsRepo = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 1,
        code: "SP000001",
        name: "Ca phe sua",
      }),
    }
    const controller = new ProductsController(
      productsService as any,
      excelService as any,
      productsRepo as any,
    )

    await controller.importExcel({ buffer: Buffer.from("excel") } as Express.Multer.File)

    expect(productsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "https://cdn.example.com/ca-phe-sua.jpg",
      }),
    )
  })
})
