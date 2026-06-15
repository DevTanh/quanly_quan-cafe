import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiCookieAuth } from "@nestjs/swagger"
import { CustomersService } from "./services/customers.service"
import { CreateCustomerDto } from "./dto/create-customer.dto"
import { UpdateCustomerDto } from "./dto/update-customer.dto"
import { UpdatePointsDto } from "./dto/update-points.dto"
import { QueryCustomerDto } from "./dto/query-customer.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@ApiTags("Customers")
@ApiCookieAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * GET /customers
   * Danh sách khách hàng, hỗ trợ search và filter isActive.
   */
  @Get()
  @RequirePermissions("customer:view")
  @ApiOperation({ summary: "Danh sách khách hàng — Admin, Manager, Cashier" })
  findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query)
  }

  /**
   * GET /customers/phone/:phone
   * Tra cứu nhanh theo số điện thoại — dùng khi cashier tìm khách ở POS.
   */
  @Get("phone/:phone")
  @RequirePermissions("customer:view")
  @ApiOperation({ summary: "Tra cứu khách hàng theo SĐT — tất cả vai trò" })
  findByPhone(@Param("phone") phone: string) {
    return this.customersService.findByPhone(phone)
  }

  /**
   * GET /customers/:id
   */
  @Get(":id")
  @RequirePermissions("customer:view")
  @ApiOperation({ summary: "Chi tiết khách hàng" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.findById(id)
  }

  /**
   * POST /customers
   * Tạo khách hàng mới — yêu cầu phone duy nhất.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("customer:create")
  @ApiOperation({ summary: "Tạo khách hàng mới — Admin, Manager, Cashier" })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto)
  }

  /**
   * PATCH /customers/:id
   * Cập nhật thông tin khách hàng.
   */
  @Patch(":id")
  @RequirePermissions("customer:manage")
  @ApiOperation({ summary: "Cập nhật thông tin khách hàng — Admin, Manager" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto)
  }

  /**
   * PATCH /customers/:id/points
   * Cộng hoặc trừ điểm tích lũy. delta dương = cộng, delta âm = trừ.
   */
  @Patch(":id/points")
  @RequirePermissions("customer:update_points")
  @ApiOperation({ summary: "Cập nhật điểm tích lũy — Admin, Manager, Cashier" })
  updatePoints(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePointsDto,
  ) {
    return this.customersService.updatePoints(id, dto)
  }

  /**
   * PATCH /customers/:id/disable
   */
  @Patch(":id/disable")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("customer:manage")
  @ApiOperation({ summary: "Vô hiệu hóa khách hàng — Admin, Manager" })
  disable(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.disable(id)
  }

  /**
   * PATCH /customers/:id/enable
   */
  @Patch(":id/enable")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("customer:manage")
  @ApiOperation({ summary: "Kích hoạt lại khách hàng — Admin, Manager" })
  enable(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.enable(id)
  }
}
