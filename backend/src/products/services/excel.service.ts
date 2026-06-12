import { Injectable, BadRequestException } from "@nestjs/common"
import ExcelJS from "exceljs"
import { CategoriesRepository } from "../repositories/categories.repository"
import {
  MenuType,
  ProductStatus,
  MENU_TYPE_LABELS,
  PRODUCT_STATUS_LABELS,
} from "../entities/product.entity"
import type { Product } from "../entities/product.entity"

// Reverse maps: Vietnamese label → enum value
const MENU_TYPE_REVERSE = Object.fromEntries(
  Object.entries(MENU_TYPE_LABELS).map(([k, v]) => [v, k]),
) as Record<string, MenuType>

const PRODUCT_STATUS_REVERSE = Object.fromEntries(
  Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => [v, k]),
) as Record<string, ProductStatus>

export interface ExcelImportRow {
  code?: string
  name: string
  menuType: MenuType
  categoryId: number
  costPrice: number
  sellingPrice: number
  stock: number
  status: ProductStatus
  imageUrl?: string
}

export interface ImportResult {
  valid: ExcelImportRow[]
  errors: Array<{ row: number; message: string }>
}

@Injectable()
export class ExcelService {
  constructor(private readonly categoriesRepo: CategoriesRepository) {}

  // ─── TEMPLATE ─────────────────────────────────────────────────

  async generateTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Hàng hóa")

    sheet.columns = [
      { header: "Mã hàng", key: "code", width: 15 },
      { header: "Tên hàng (*)", key: "name", width: 30 },
      { header: "Loại thực đơn (*)", key: "menuType", width: 18 },
      { header: "Danh mục (*)", key: "category", width: 18 },
      { header: "Giá vốn", key: "costPrice", width: 15 },
      { header: "Giá bán", key: "sellingPrice", width: 15 },
      { header: "Tồn kho", key: "stock", width: 12 },
      { header: "Trạng thái", key: "status", width: 18 },
      { header: "Hình ảnh", key: "imageUrl", width: 45 },
    ]

    // Style header
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }

    // Thêm dòng mẫu
    sheet.addRow({
      code: "SP000001",
      name: "Cà phê đen",
      menuType: "Đồ uống",
      category: "Cà phê",
      costPrice: 10000,
      sellingPrice: 25000,
      stock: 100,
      status: "Đang kinh doanh",
      imageUrl: "",
    })

    // Thêm sheet hướng dẫn
    const guideSheet = workbook.addWorksheet("Hướng dẫn")
    guideSheet.getColumn(1).width = 25
    guideSheet.getColumn(2).width = 50

    const guideRows = [
      ["Trường", "Giá trị hợp lệ"],
      ["Mã hàng", "Để trống → tự sinh. Hoặc nhập tay (unique)"],
      ["Loại thực đơn", Object.values(MENU_TYPE_LABELS).join(", ")],
      ["Danh mục", "(Tên danh mục đã có trong hệ thống)"],
      ["Trạng thái", Object.values(PRODUCT_STATUS_LABELS).join(", ")],
      ["Hình ảnh", "Link ảnh public http/https; để trống nếu không có"],
      ["(*)", "Trường bắt buộc"],
    ]
    guideRows.forEach((row) => guideSheet.addRow(row))
    guideSheet.getRow(1).font = { bold: true }

    return await workbook.xlsx.writeBuffer()
  }

  // ─── EXPORT ───────────────────────────────────────────────────

  async exportProducts(products: Product[]): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Hàng hóa")

    sheet.columns = [
      { header: "Mã hàng", key: "code", width: 15 },
      { header: "Tên hàng", key: "name", width: 30 },
      { header: "Loại thực đơn", key: "menuType", width: 18 },
      { header: "Danh mục", key: "category", width: 18 },
      { header: "Giá vốn", key: "costPrice", width: 15 },
      { header: "Giá bán", key: "sellingPrice", width: 15 },
      { header: "Tồn kho", key: "stock", width: 12 },
      { header: "Trạng thái", key: "status", width: 18 },
      { header: "Hình ảnh", key: "imageUrl", width: 45 },
    ]

    // Style header
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }

    for (const p of products) {
      sheet.addRow({
        code: p.code,
        name: p.name,
        menuType: MENU_TYPE_LABELS[p.menuType] ?? p.menuType,
        category: p.category?.name ?? "",
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        stock: p.stock,
        status: PRODUCT_STATUS_LABELS[p.status] ?? p.status,
        imageUrl: p.imageUrl ?? "",
      })
    }

    return await workbook.xlsx.writeBuffer()
  }

  // ─── IMPORT (parse + validate) ────────────────────────────────

  async parseAndValidate(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

    const sheet = workbook.getWorksheet("Hàng hóa") ?? workbook.worksheets[0]
    if (!sheet) throw new BadRequestException("File Excel không có worksheet hợp lệ")

    // Load categories cho lookup
    const categories = await this.categoriesRepo.findAll()
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

    const valid: ExcelImportRow[] = []
    const errors: ImportResult["errors"] = []

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // skip header

      const code = this.cellToString(row.getCell(1))
      const name = this.cellToString(row.getCell(2))
      const menuTypeLabel = this.cellToString(row.getCell(3))
      const categoryLabel = this.cellToString(row.getCell(4))
      const costPrice = this.cellToNumber(row.getCell(5))
      const sellingPrice = this.cellToNumber(row.getCell(6))
      const stock = this.cellToNumber(row.getCell(7))
      const statusLabel = this.cellToString(row.getCell(8))
      const rawImageUrl = this.cellToString(row.getCell(9))

      const rowErrors: string[] = []

      // Validate required
      if (!name) rowErrors.push("Tên hàng không được để trống")

      // Validate menuType
      const menuType = MENU_TYPE_REVERSE[menuTypeLabel]
      if (!menuTypeLabel) {
        rowErrors.push("Loại thực đơn không được để trống")
      } else if (!menuType) {
        rowErrors.push(`Loại thực đơn "${menuTypeLabel}" không hợp lệ`)
      }

      // Validate category
      const categoryId = categoryMap.get(categoryLabel.toLowerCase())
      if (!categoryLabel) {
        rowErrors.push("Danh mục không được để trống")
      } else if (!categoryId) {
        rowErrors.push(`Danh mục "${categoryLabel}" không tồn tại`)
      }

      // Validate status (có thể để trống → mặc định active)
      let status = ProductStatus.ACTIVE
      if (statusLabel) {
        const parsed = PRODUCT_STATUS_REVERSE[statusLabel]
        if (!parsed) {
          rowErrors.push(`Trạng thái "${statusLabel}" không hợp lệ`)
        } else {
          status = parsed
        }
      }

      // Validate numbers
      if (sellingPrice < 0) rowErrors.push("Giá bán không được âm")
      if (costPrice < 0) rowErrors.push("Giá vốn không được âm")
      if (stock < 0) rowErrors.push("Tồn kho không được âm")

      const imageUrl = this.parseImageUrl(rawImageUrl)
      if (rawImageUrl && !imageUrl) {
        errors.push({ row: rowNumber, message: `Link hình ảnh "${rawImageUrl}" không hợp lệ` })
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, message: rowErrors.join("; ") })
      } else {
        valid.push({
          code: code || undefined,
          name,
          menuType: menuType!,
          categoryId: categoryId!,
          costPrice,
          sellingPrice,
          stock,
          status,
          imageUrl,
        })
      }
    })

    if (valid.length === 0 && errors.length === 0) {
      throw new BadRequestException("File Excel không có dữ liệu")
    }

    return { valid, errors }
  }

  // ─── HELPERS ──────────────────────────────────────────────────

  private cellToString(cell: ExcelJS.Cell): string {
    const val = cell.value
    if (val == null) return ""
    if (typeof val === "object" && "text" in val) return String(val.text).trim()
    return String(val).trim()
  }

  private cellToNumber(cell: ExcelJS.Cell): number {
    const val = cell.value
    if (val == null) return 0
    const num = Number(val)
    return isNaN(num) ? 0 : num
  }

  private parseImageUrl(value: string): string | undefined {
    if (!value) return undefined
    if (value.length > 500) return undefined

    try {
      const url = new URL(value)
      if (url.username || url.password) return undefined
      return ["http:", "https:"].includes(url.protocol) ? value : undefined
    } catch {
      return undefined
    }
  }
}
