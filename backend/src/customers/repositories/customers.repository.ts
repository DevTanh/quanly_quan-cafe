import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Customer } from "../entities/customer.entity"
import type { QueryCustomerDto } from "../dto/query-customer.dto"

export interface PaginatedCustomers {
  data: Customer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

@Injectable()
export class CustomersRepository {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  async findByQuery(query: QueryCustomerDto): Promise<PaginatedCustomers> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

    const qb = this.repo.createQueryBuilder("c").orderBy("c.createdAt", "DESC")

    if (query.search) {
      qb.andWhere(
        "(c.fullName LIKE :search OR c.phone LIKE :search OR c.email LIKE :search)",
        { search: `%${query.search}%` },
      )
    }

    if (query.isActive !== undefined) {
      qb.andWhere("c.isActive = :isActive", { isActive: query.isActive })
    }

    const total = await qb.getCount()
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: number): Promise<Customer | null> {
    return await this.repo.findOne({ where: { id } })
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return await this.repo.findOne({ where: { phone } })
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    return await this.repo.save(this.repo.create(data))
  }

  async update(id: number, data: Partial<Customer>): Promise<Customer | null> {
    await this.repo.update(id, data)
    return await this.findById(id)
  }
}
