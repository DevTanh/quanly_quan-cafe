import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Payment } from "../entities/payment.entity"
import type { QueryPaymentDto } from "../dto/query-payment.dto"
import type { PaginatedResult } from "./orders.repository"

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async findByOrderId(orderId: number): Promise<Payment | null> {
    return await this.repo.findOne({ where: { orderId } })
  }

  async findByQuery(query: QueryPaymentDto): Promise<PaginatedResult<Payment>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

    const qb = this.repo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.order", "order")
      .orderBy("p.paidAt", "DESC")

    if (query.from) {
      qb.andWhere("p.paid_at >= :from", { from: this.startOfDay(query.from) })
    }
    if (query.to) {
      qb.andWhere("p.paid_at <= :to", { to: this.endOfDay(query.to) })
    }
    if (query.method) {
      qb.andWhere("p.method = :method", { method: query.method })
    }
    if (query.status) {
      qb.andWhere("p.payment_status = :status", { status: query.status })
    }
    if (query.search) {
      const orderId = this.parseInvoiceCode(query.search)
      if (orderId) {
        qb.andWhere("p.order_id = :orderId", { orderId })
      }
    }

    const total = await qb.getCount()
    const data = (await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()).map((payment) => this.withInvoiceCode(payment))

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async create(data: Partial<Payment>): Promise<Payment> {
    const entity = this.repo.create(data)
    return await this.repo.save(entity)
  }

  async update(id: number, data: Partial<Payment>): Promise<void> {
    await this.repo.update(id, data)
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id)
  }

  private parseInvoiceCode(search: string): number | null {
    const match = search.trim().match(/^HD0*(\d+)$/i)
    if (!match) return null
    return Number(match[1])
  }

  private startOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`)
    }
    return new Date(value)
  }

  private endOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T23:59:59.999Z`)
    }
    return new Date(value)
  }

  private withInvoiceCode(payment: Payment): Payment {
    return Object.assign(payment, {
      invoiceCode: `HD${String(payment.orderId).padStart(6, "0")}`,
    })
  }
}
