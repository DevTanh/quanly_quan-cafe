import ExcelJS from "exceljs"
import { ExcelService } from "./excel.service"
import {
  MenuType,
  ProductStatus,
  MENU_TYPE_LABELS,
  PRODUCT_STATUS_LABELS,
} from "../entities/product.entity"

describe("ExcelService", () => {
  const categoriesRepo = {
    findAll: jest.fn(),
  }

  let service: ExcelService

  beforeEach(() => {
    categoriesRepo.findAll.mockResolvedValue([{ id: 1, name: "Coffee" }])
    service = new ExcelService(categoriesRepo as any)
  })

  async function loadWorkbook(buffer: ExcelJS.Buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    return workbook
  }

  it("adds an image URL column to the import template", async () => {
    const workbook = await loadWorkbook(await service.generateTemplate())
    const sheet = workbook.worksheets[0]

    expect(sheet.getRow(1).getCell(9).value).toBe("Hình ảnh")
  })

  it("exports product image URLs to Excel", async () => {
    const workbook = await loadWorkbook(
      await service.exportProducts([
        {
          code: "SP000001",
          name: "Ca phe sua",
          menuType: MenuType.BEVERAGE,
          category: { name: "Coffee" },
          costPrice: 10000,
          sellingPrice: 25000,
          stock: 10,
          status: ProductStatus.ACTIVE,
          imageUrl: "https://cdn.example.com/ca-phe-sua.jpg",
        } as any,
      ]),
    )
    const sheet = workbook.worksheets[0]

    expect(sheet.getRow(1).getCell(9).value).toBe("Hình ảnh")
    expect(sheet.getRow(2).getCell(9).value).toBe("https://cdn.example.com/ca-phe-sua.jpg")
  })

  it("imports valid image URLs and skips invalid image URLs without skipping products", async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Products")
    sheet.addRow([
      "Ma hang",
      "Ten hang",
      "Loai thuc don",
      "Danh muc",
      "Gia von",
      "Gia ban",
      "Ton kho",
      "Trang thai",
      "Hình ảnh",
    ])
    sheet.addRow([
      "SP000001",
      "Ca phe sua",
      MENU_TYPE_LABELS[MenuType.BEVERAGE],
      "Coffee",
      10000,
      25000,
      10,
      PRODUCT_STATUS_LABELS[ProductStatus.ACTIVE],
      "https://cdn.example.com/ca-phe-sua.jpg",
    ])
    sheet.addRow([
      "SP000002",
      "Bac xiu",
      MENU_TYPE_LABELS[MenuType.BEVERAGE],
      "Coffee",
      10000,
      22000,
      8,
      PRODUCT_STATUS_LABELS[ProductStatus.ACTIVE],
      "not-a-url",
    ])
    sheet.addRow([
      "SP000003",
      "Latte",
      MENU_TYPE_LABELS[MenuType.BEVERAGE],
      "Coffee",
      12000,
      30000,
      5,
      PRODUCT_STATUS_LABELS[ProductStatus.ACTIVE],
      "https://user:secret@cdn.example.com/private.jpg",
    ])

    const result = await service.parseAndValidate(
      (await workbook.xlsx.writeBuffer()) as Buffer,
    )

    expect(result.valid).toHaveLength(3)
    expect(result.valid[0].imageUrl).toBe("https://cdn.example.com/ca-phe-sua.jpg")
    expect(result.valid[1].imageUrl).toBeUndefined()
    expect(result.valid[2].imageUrl).toBeUndefined()
    expect(result.errors).toEqual([
      { row: 3, message: 'Link hình ảnh "not-a-url" không hợp lệ' },
      {
        row: 4,
        message:
          'Link hình ảnh "https://user:secret@cdn.example.com/private.jpg" không hợp lệ',
      },
    ])
  })
})
