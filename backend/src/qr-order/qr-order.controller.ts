// Đặt tại: src/qr-order/qr-order.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common"
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger"

// ── Import đúng đường dẫn thật trong dự án ──────────────────────
import { Public } from "../auth/decorators/public.decorator"
import { QrOrderService } from "./services/qr-order.service"
import { CreateQrOrderDto } from "./create-qr-order.dto"

@ApiTags("Public — QR Order")
@Controller("public/qr-order")
export class QrOrderController {
  constructor(private readonly qrOrderService: QrOrderService) { }

  /**
   * GET /public/qr-order/menu
   * Thực đơn công khai — khách quét QR, không cần đăng nhập.
   */
  @Public()
  @Get("menu")
  @ApiOperation({ summary: "Lấy thực đơn công khai — không cần xác thực" })
  @ApiResponse({ status: 200, description: "Danh sách sản phẩm đang kinh doanh" })
  getMenu() {
    return this.qrOrderService.getPublicMenu()
  }

  /**
   * GET /public/qr-order/table/:tableId
   * Thông tin bàn để hiển thị tên bàn trên màn hình QR.
   */
  @Public()
  @Get("table/:tableId")
  @ApiOperation({ summary: "Thông tin bàn theo ID — hiển thị trên màn hình QR" })
  @ApiParam({ name: "tableId", type: Number })
  @ApiResponse({ status: 200, description: "Thông tin bàn" })
  @ApiResponse({ status: 404, description: "Bàn không tồn tại" })
  getTableInfo(@Param("tableId", ParseIntPipe) tableId: number) {
    return this.qrOrderService.getTableInfo(tableId)
  }

  /**
   * POST /public/qr-order
   * Khách gửi đơn gọi món từ QR — không cần xác thực.
   *
   * Body:
   * {
   *   "tableId": 5,
   *   "items": [
   *     { "productId": 3, "quantity": 2, "note": "Ít đường" },
   *     { "productId": 7, "quantity": 1 }
   *   ],
   *   "note": "Ngồi ngoài sân vườn"
   * }
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Gửi đơn gọi món từ QR — không cần xác thực",
    description:
      "Logic chạy trong TypeORM Transaction: validate bàn + sản phẩm, " +
      "tạo hoặc thêm vào order đang mở, cập nhật trạng thái bàn. " +
      "Bất kỳ lỗi nào xảy ra sẽ rollback toàn bộ.",
  })
  @ApiResponse({ status: 201, description: "Đơn gọi món đã được ghi nhận" })
  @ApiResponse({ status: 400, description: "Món đã ngừng phục vụ hoặc dữ liệu không hợp lệ" })
  @ApiResponse({ status: 404, description: "Bàn hoặc sản phẩm không tồn tại" })
  createOrder(@Body() dto: CreateQrOrderDto) {
    return this.qrOrderService.createOrder(dto)
  }
}