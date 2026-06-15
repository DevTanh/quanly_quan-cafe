import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiCookieAuth, ApiBody } from "@nestjs/swagger"
import type { Response } from "express"
import ExcelJS from "exceljs"
import { IsOptional, IsString, MaxLength } from "class-validator"
import { PaymentsRepository } from "./repositories/payments.repository"
import { QueryPaymentDto } from "./dto/query-payment.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import type { JwtPayload } from "../auth/guards/jwt-auth.guard"
import { Payment, PaymentStatus } from "./entities/payment.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

class RefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

type PaymentWithInvoiceCode = Payment & { invoiceCode?: string }

@ApiTags("Payments")
@ApiCookieAuth()
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ─── GET /payments/export/excel ──────────────────────────────────────────
  @Get("export/excel")
  @RequirePermissions("report:export")
  @ApiOperation({ summary: "Xuất danh sách giao dịch ra Excel" })
  async exportExcel(@Query() query: QueryPaymentDto, @Res() res: Response) {
    const result = await this.paymentsRepo.findByQuery({
      ...query,
      page: 1,
      limit: 10000,
    })
    const buffer = await this.exportPayments(result.data)

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="payments.xlsx"',
    )
    res.end(buffer)
  }

  // ─── GET /payments ───────────────────────────────────────────────────────
  @Get()
  @RequirePermissions("payment:view_all")
  @ApiOperation({ summary: "Danh sách giao dịch thanh toán" })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsRepo.findByQuery(query)
  }

  // ─── POST /payments/:id/refund ────────────────────────────────────────────
  @Post(":id/refund")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("payment:refund")
  @ApiOperation({ summary: "Yêu cầu hoàn tiền — Cashier, Manager, Admin" })
  @ApiBody({ type: RefundDto, required: false })
  async requestRefund(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RefundDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ["order"],
    })
    if (!payment) {
      throw new NotFoundException(`Giao dịch #${id} không tồn tại`)
    }
    if (payment.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        `Chỉ có thể hoàn tiền giao dịch đã thanh toán. Trạng thái hiện tại: ${payment.paymentStatus}`,
      )
    }

    // Đánh dấu refund pending — cần Manager/Admin approve
    await this.paymentRepo.update(id, {
      paymentStatus: PaymentStatus.REFUND_PENDING,
      refundReason: dto?.reason,
      refundRequestedBy: user.sub,
      refundRequestedAt: new Date(),
    })

    const updated = await this.paymentRepo.findOne({ where: { id }, relations: ["order"] })
    return {
      message: "Yêu cầu hoàn tiền đã được ghi nhận. Chờ Manager/Admin xác nhận.",
      data: updated,
    }
  }

  // ─── POST /payments/:id/approve-refund ──────────────────────────────────
  @Post(":id/approve-refund")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("payment:approve_refund")
  @ApiOperation({ summary: "Phê duyệt hoàn tiền — Manager, Admin" })
  async approveRefund(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ["order"],
    })
    if (!payment) {
      throw new NotFoundException(`Giao dịch #${id} không tồn tại`)
    }
    if (payment.paymentStatus !== PaymentStatus.REFUND_PENDING) {
      throw new BadRequestException(
        `Giao dịch không ở trạng thái chờ hoàn tiền. Trạng thái hiện tại: ${payment.paymentStatus}`,
      )
    }

    await this.paymentRepo.update(id, {
      paymentStatus: PaymentStatus.REFUNDED,
      refundApprovedBy: user.sub,
      refundApprovedAt: new Date(),
    })

    const updated = await this.paymentRepo.findOne({ where: { id }, relations: ["order"] })
    return {
      message: "Hoàn tiền đã được phê duyệt thành công.",
      data: updated,
    }
  }

  private async exportPayments(payments: PaymentWithInvoiceCode[]): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Giao dịch")

    sheet.columns = [
      { header: "Mã hóa đơn", key: "invoiceCode", width: 16 },
      { header: "Thời gian", key: "paidAt", width: 22 },
      { header: "Bàn", key: "tableId", width: 10 },
      { header: "Phương thức", key: "method", width: 18 },
      { header: "Trạng thái", key: "paymentStatus", width: 14 },
      { header: "Tổng tiền", key: "amount", width: 15 },
      { header: "Khách trả", key: "receivedAmount", width: 15 },
      { header: "Tiền thừa", key: "changeAmount", width: 15 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    }

    for (const payment of payments) {
      sheet.addRow({
        invoiceCode: payment.invoiceCode,
        paidAt: payment.paidAt,
        tableId: payment.order?.tableId ?? "",
        method: payment.method,
        paymentStatus: payment.paymentStatus,
        amount: Number(payment.amount),
        receivedAmount: Number(payment.receivedAmount),
        changeAmount: Number(payment.changeAmount),
      })
    }

    return await workbook.xlsx.writeBuffer()
  }
}
