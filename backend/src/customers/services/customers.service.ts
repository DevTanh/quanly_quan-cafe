import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { CustomersRepository } from "../repositories/customers.repository"
import type { CreateCustomerDto } from "../dto/create-customer.dto"
import type { UpdateCustomerDto } from "../dto/update-customer.dto"
import type { UpdatePointsDto } from "../dto/update-points.dto"
import type { QueryCustomerDto } from "../dto/query-customer.dto"

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepo: CustomersRepository) {}

  async findAll(query: QueryCustomerDto) {
    return await this.customersRepo.findByQuery(query)
  }

  async findById(id: number) {
    const customer = await this.customersRepo.findById(id)
    if (!customer) throw new NotFoundException(`Khách hàng #${id} không tồn tại`)
    return customer
  }

  async findByPhone(phone: string) {
    const customer = await this.customersRepo.findByPhone(phone)
    if (!customer) throw new NotFoundException(`Khách hàng với SĐT ${phone} không tồn tại`)
    return customer
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.customersRepo.findByPhone(dto.phone)
    if (existing) {
      throw new ConflictException(`Số điện thoại ${dto.phone} đã được đăng ký`)
    }
    return await this.customersRepo.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      note: dto.note,
      points: 0,
      isActive: true,
    })
  }

  async update(id: number, dto: UpdateCustomerDto) {
    const customer = await this.findById(id)

    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.customersRepo.findByPhone(dto.phone)
      if (existing) {
        throw new ConflictException(`Số điện thoại ${dto.phone} đã được đăng ký`)
      }
    }

    const updated = await this.customersRepo.update(id, dto)
    return updated
  }

  async updatePoints(id: number, dto: UpdatePointsDto) {
    const customer = await this.findById(id)
    const newPoints = customer.points + dto.delta
    if (newPoints < 0) {
      throw new BadRequestException(
        `Không đủ điểm. Hiện có ${customer.points}, cần trừ ${Math.abs(dto.delta)}`,
      )
    }
    const updated = await this.customersRepo.update(id, { points: newPoints })
    return updated
  }

  async disable(id: number) {
    await this.findById(id)
    return await this.customersRepo.update(id, { isActive: false })
  }

  async enable(id: number) {
    await this.findById(id)
    return await this.customersRepo.update(id, { isActive: true })
  }
}
