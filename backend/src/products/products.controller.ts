import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiCookieAuth, ApiConsumes, ApiBody } from "@nestjs/swagger"
import type { Response } from "express"
import { ProductsService } from "./services/products.service"
import { ExcelService } from "./services/excel.service"
import { ProductsRepository } from "./repositories/products.repository"
import { CreateProductDto } from "./dto/create-product.dto"
import { UpdateProductDto } from "./dto/update-product.dto"
import { QueryProductDto } from "./dto/query-product.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@ApiTags("Products")
@ApiCookieAuth()
@Controller("products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly excelService: ExcelService,
    private readonly productsRepo: ProductsRepository,
  ) { }

  // ─── GET /products ────────────────────────────────────────────
  @Get()
  @RequirePermissions("product:view")
  @ApiOperation({ summary: "Danh sách hàng hóa (search, filter, phân trang)" })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query)
  }

  // ─── GET /products/export/excel ──────────────────────────────
  @Get("export/excel")
  @RequirePermissions("product:manage")
  @ApiOperation({ summary: "Xuất danh sách hàng hóa ra Excel" })
  async exportExcel(@Res() res: Response) {
    const products = await this.productsService.findAllForExport()
    const buffer = await this.excelService.exportProducts(products)

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=hang-hoa.xlsx",
    )
    res.end(buffer)
  }

  // ─── GET /products/template/excel ────────────────────────────
  @Get("template/excel")
  @RequirePermissions("product:manage")
  @ApiOperation({ summary: "Tải file mẫu Excel để import hàng hóa" })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.excelService.generateTemplate()

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=mau-import-hang-hoa.xlsx",
    )
    res.end(buffer)
  }

  // ─── GET /products/:id ───────────────────────────────────────
  @Get(":id")
  @RequirePermissions("product:view")
  @ApiOperation({ summary: "Chi tiết hàng hóa" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findById(id)
  }

  // ─── POST /products ──────────────────────────────────────────
  @Post()
  @RequirePermissions("product:manage")
  @UseInterceptors(FileInterceptor("image"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Thêm hàng hóa — Admin/Manager" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        code: { type: "string" },
        menuType: { type: "string", enum: ["food", "beverage", "other"] },
        categoryId: { type: "number" },
        status: { type: "string", enum: ["active", "inactive"] },
        costPrice: { type: "number" },
        sellingPrice: { type: "number" },
        stock: { type: "number" },
        minStock: { type: "number" },
        maxStock: { type: "number" },
        image: { type: "string", format: "binary" },
      },
    },
  })
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.create(dto, file)
  }

  // ─── PATCH /products/:id ─────────────────────────────────────
  @Patch(":id")
  @RequirePermissions("product:manage")
  @UseInterceptors(FileInterceptor("image"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Cập nhật hàng hóa — Admin/Manager" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, dto, file)
  }

  // ─── DELETE /products/:id ────────────────────────────────────
  @Delete(":id")
  @RequirePermissions("product:manage")
  @ApiOperation({ summary: "Xóa hàng hóa — Admin/Manager" })
  async delete(@Param("id", ParseIntPipe) id: number) {
    await this.productsService.delete(id)
    return { statusCode: 200, message: `Đã xóa sản phẩm #${id} thành công` }
  }

  // ─── POST /products/import/excel ─────────────────────────────
  @Post("import/excel")
  @RequirePermissions("product:manage")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Import hàng hóa từ file Excel" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { statusCode: 400, message: "Vui lòng upload file Excel" }
    }

    const { valid, errors } = await this.excelService.parseAndValidate(file.buffer)

    // Import dữ liệu hợp lệ
    const imported: Array<{ id: number; code: string; name: string }> = []
    const importErrors = [...errors]

    for (const row of valid) {
      try {
        // Auto-generate code nếu không có
        let code = row.code
        if (!code) {
          code = await this.productsRepo.getNextCode()
        } else {
          const existing = await this.productsRepo.findByCode(code)
          if (existing) {
            importErrors.push({ row: 0, message: `Mã hàng "${code}" đã tồn tại` })
            continue
          }
        }

        const product = await this.productsRepo.create({
          code,
          name: row.name,
          menuType: row.menuType,
          categoryId: row.categoryId,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          stock: row.stock,
          status: row.status,
        })
        imported.push({ id: product.id, code: product.code, name: product.name })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định"
        importErrors.push({ row: 0, message: `Lỗi import "${row.name}": ${message}` })
      }
    }

    return {
      statusCode: 200,
      message: `Import thành công ${imported.length} sản phẩm`,
      imported: imported.length,
      errors: importErrors,
    }
  }
}
