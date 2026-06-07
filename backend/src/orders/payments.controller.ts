import { Controller, Get, Query, Res } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiCookieAuth } from "@nestjs/swagger"
import type { Response } from "express"
import ExcelJS from "exceljs"
import { PaymentsRepository } from "./repositories/payments.repository"
import { QueryPaymentDto } from "./dto/query-payment.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"
import type { Payment } from "./entities/payment.entity"

type PaymentWithInvoiceCode = Payment & { invoiceCode?: string }

@ApiTags("Payments")
@ApiCookieAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsRepo: PaymentsRepository) {}

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
