import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common"
import { ProductsRepository } from "../repositories/products.repository"
import { CategoriesRepository } from "../repositories/categories.repository"
import { CloudinaryService } from "./cloudinary.service"
import { CreateProductDto } from "../dto/create-product.dto"
import { UpdateProductDto } from "../dto/update-product.dto"
import type { QueryProductDto } from "../dto/query-product.dto"
import type { Product } from "../entities/product.entity"
import type { PaginatedResult } from "../repositories/products.repository"

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepo: ProductsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  // ─── QUERIES ──────────────────────────────────────────────────────

  async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
    return await this.productsRepo.findByQuery(query)
  }

  async findById(id: number): Promise<Product> {
    const product = await this.productsRepo.findById(id)
    if (!product) throw new NotFoundException(`Sản phẩm #${id} không tồn tại`)
    return product
  }

  async bulkDelete(ids: number[]): Promise<{ deleted: number; failed: number[] }> {
    const failed: number[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        const product = await this.productsRepo.findById(id);
        if (!product) {
          failed.push(id);
          continue;
        }
        if (product.imagePublicId) {
          await this.cloudinaryService.delete(product.imagePublicId);
        }
        await this.productsRepo.delete(id);
        deleted++;
      } catch {
        failed.push(id);
      }
    }

    return { deleted, failed };
  }
  // ─── CREATE ───────────────────────────────────────────────────────

  async create(
    dto: CreateProductDto,
    file?: Express.Multer.File,
  ): Promise<Product> {
    // Validate category tồn tại
    const category = await this.categoriesRepo.findById(dto.categoryId)
    if (!category) {
      throw new BadRequestException(`Danh mục #${dto.categoryId} không tồn tại`)
    }

    // Auto-generate code nếu không nhập
    let code = dto.code?.trim()
    if (!code) {
      code = await this.productsRepo.getNextCode()
    } else {
      const existing = await this.productsRepo.findByCode(code)
      if (existing) throw new ConflictException(`Mã hàng "${code}" đã tồn tại`)
    }

    // Upload image nếu có
    let imageUrl: string | undefined
    let imagePublicId: string | undefined
    if (file) {
      const result = await this.cloudinaryService.upload(file)
      imageUrl = result.url
      imagePublicId = result.publicId
    }

    // Validate tồn kho
    this.validateStock(dto.stock, dto.minStock, dto.maxStock)

    const product = await this.productsRepo.create({
      code,
      name: dto.name,
      menuType: dto.menuType,
      categoryId: dto.categoryId,
      status: dto.status,
      costPrice: dto.costPrice,
      sellingPrice: dto.sellingPrice,
      stock: dto.stock,
      minStock: dto.minStock,
      maxStock: dto.maxStock,
      imageUrl,
      imagePublicId,
    })

    return (await this.productsRepo.findById(product.id))!
  }

  // ─── UPDATE ───────────────────────────────────────────────────────

  async update(
    id: number,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ): Promise<Product> {
    const product = await this.findById(id)

    // Validate category nếu thay đổi
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.categoriesRepo.findById(dto.categoryId)
      if (!category) {
        throw new BadRequestException(`Danh mục #${dto.categoryId} không tồn tại`)
      }
    }

    // Upload ảnh mới → xóa ảnh cũ
    let imageUrl: string | undefined
    let imagePublicId: string | undefined
    if (file) {
      const result = await this.cloudinaryService.upload(file)
      // Xóa ảnh cũ trên Cloudinary nếu có
      if (product.imagePublicId) {
        await this.cloudinaryService.delete(product.imagePublicId)
      }
      imageUrl = result.url
      imagePublicId = result.publicId
    }

    // Validate tồn kho
    const stock = dto.stock ?? product.stock
    const minStock = dto.minStock ?? product.minStock
    const maxStock = dto.maxStock ?? product.maxStock
    this.validateStock(stock, minStock, maxStock)

    // Chỉ map các field hợp lệ của Product để tránh lỗi
    // EntityPropertyNotFoundError khi multipart gửi thêm field lạ (vd: image)
    const updateData: Partial<Product> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.menuType !== undefined ? { menuType: dto.menuType } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
      ...(dto.sellingPrice !== undefined ? { sellingPrice: dto.sellingPrice } : {}),
      ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
      ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
      ...(dto.maxStock !== undefined ? { maxStock: dto.maxStock } : {}),
      ...(file ? { imageUrl, imagePublicId } : {}),
    }

    const updated = await this.productsRepo.update(id, updateData)
    return updated!
  }

  // ─── DELETE ───────────────────────────────────────────────────────

  async delete(id: number): Promise<void> {
    const product = await this.findById(id)

    // Xóa ảnh trên Cloudinary
    if (product.imagePublicId) {
      await this.cloudinaryService.delete(product.imagePublicId)
    }

    await this.productsRepo.delete(id)
  }

  // ─── Lấy tất cả sản phẩm (cho export Excel) ─────────────────────

  async findAllForExport(): Promise<Product[]> {
    return await this.productsRepo.findAll()
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  private validateStock(stock?: number, minStock?: number, maxStock?: number): void {
    if (maxStock != null && minStock != null && maxStock > 0 && minStock > maxStock) {
      throw new BadRequestException("Tồn tối thiểu không được lớn hơn tồn tối đa")
    }
    if (maxStock != null && stock != null && maxStock > 0 && stock > maxStock) {
      throw new BadRequestException("Tồn kho hiện tại không được lớn hơn tồn tối đa")
    }
  }
}
