import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiCookieAuth } from "@nestjs/swagger"
import { OrdersService } from "./services/orders.service"
import { CreateOrderDto } from "./dto/create-order.dto"
import { UpdateOrderItemsDto } from "./dto/update-order-items.dto"
import { CreatePaymentDto } from "./dto/create-payment.dto"
import { UpdateOrderItemStatusDto } from "./dto/update-order-item-status.dto"
import { QueryOrderDto } from "./dto/query-order.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import type { JwtPayload } from "../auth/guards/jwt-auth.guard"

@ApiTags("Orders")
@ApiCookieAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── GET /orders ──────────────────────────────────────────────
  @Get()
  @RequirePermissions("order:view_own")
  @ApiOperation({ summary: "Danh sách orders (filter theo tableId, status...)" })
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query)
  }

  // ─── GET /orders/:id ─────────────────────────────────────────
  @Get(":id")
  @RequirePermissions("order:view_own")
  @ApiOperation({ summary: "Chi tiết order" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.findById(id)
  }

  // ─── GET /orders/:id/payment-status ──────────────────────────
  @Get(":id/payment-status")
  @RequirePermissions("order:view_own")
  @ApiOperation({ summary: "Polling trạng thái thanh toán (QR)" })
  getPaymentStatus(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.getPaymentStatus(id)
  }

  // ─── POST /orders ────────────────────────────────────────────
  @Post()
  @RequirePermissions("order:create")
  @ApiOperation({ summary: "Tạo order mới cho bàn" })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.create(dto, user.sub)
  }

  // ─── PATCH /orders/:id/items ─────────────────────────────────
  @Patch(":id/items")
  @RequirePermissions("order:update_items")
  @ApiOperation({ summary: "Cập nhật danh sách món trong order" })
  updateItems(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderItemsDto,
  ) {
    return this.ordersService.updateItems(id, dto)
  }

  // ─── PATCH /orders/:orderId/items/:itemId/status ─────────────
  @Patch(":orderId/items/:itemId/status")
  @RequirePermissions("order:update_item_status")
  @ApiOperation({ summary: "Cập nhật trạng thái từng món — Barista/Staff" })
  updateItemStatus(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateItemStatus(orderId, itemId, dto.status)
  }

  // ─── POST /orders/:id/send-to-bar ───────────────────────────
  @Post(":id/send-to-bar")
  @RequirePermissions("order:send_to_bar")
  @ApiOperation({ summary: "Gửi món xuống quầy/bar pha chế" })
  sendToBar(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.sendToBar(id)
  }

  // ─── POST /orders/:id/payment ────────────────────────────────
  @Post(":id/payment")
  @RequirePermissions("payment:process")
  @ApiOperation({ summary: "Thanh toán (cash / bank_transfer / payos_qr)" })
  pay(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.pay(id, dto, user.sub)
  }

  // ─── POST /orders/:id/cancel-payment ─────────────────────────
  @Post(":id/cancel-payment")
  @RequirePermissions("payment:process")
  @ApiOperation({ summary: "Hủy QR thanh toán PayOS" })
  cancelPayment(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.cancelPaymentLink(id)
  }

  // ─── PATCH /orders/:id/cancel ────────────────────────────────
  @Patch(":id/cancel")
  @RequirePermissions("order:cancel_pending")
  @ApiOperation({ summary: "Hủy order (chỉ khi chưa thanh toán)" })
  cancel(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.cancel(id)
  }
}
