import { Controller, Get, Post, Param, Body, Query, ParseIntPipe } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { InventoryService } from "./services/inventory.service"
import { CreateStockCheckDto } from "./dto/create-stock-check.dto"
import { QueryStockCheckDto } from "./dto/query-stock-check.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import type { JwtPayload } from "../auth/guards/jwt-auth.guard"

@ApiTags("Inventory")
@ApiCookieAuth()
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("stock-checks")
  @RequirePermissions("inventory:view_all")
  @ApiOperation({ summary: "Danh sach phieu kiem kho" })
  findStockChecks(@Query() query: QueryStockCheckDto) {
    return this.inventoryService.findStockChecks(query)
  }

  @Get("stock-checks/:id")
  @RequirePermissions("inventory:view_all")
  @ApiOperation({ summary: "Chi tiet phieu kiem kho" })
  findStockCheckById(@Param("id", ParseIntPipe) id: number) {
    return this.inventoryService.findStockCheckById(id)
  }

  @Post("stock-checks")
  @RequirePermissions("inventory:update")
  @ApiOperation({ summary: "Tao phieu kiem kho va cap nhat ton kho" })
  createStockCheck(
    @Body() dto: CreateStockCheckDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.createStockCheck(dto, user.sub)
  }

  @Get("low-stock")
  @RequirePermissions("inventory:report_low")
  @ApiOperation({ summary: "Danh sach hang sap het ton kho" })
  findLowStock() {
    return this.inventoryService.findLowStock()
  }
}
