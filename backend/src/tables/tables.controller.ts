import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { TablesService } from "./services/tables.service"
import { CreateTableDto } from "./dto/create-table.dto"
import { UpdateTableDto } from "./dto/update-table.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@ApiTags("Tables")
@ApiCookieAuth()
@Controller("tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Danh sách bàn" })
  findAll() {
    return this.tablesService.findTables()
  }

  @Get(":id")
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Chi tiết bàn" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.tablesService.findTableById(id)
  }

  @Post()
  @RequirePermissions("table:manage")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo bàn mới" })
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto)
  }

  @Patch(":id")
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Cập nhật thông tin bàn" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(id, dto)
  }

  @Patch(":id/status")
  @RequirePermissions("table:update_status")
  @ApiOperation({ summary: "Cập nhật trạng thái bàn" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    if (!dto.status) throw new BadRequestException("Trạng thái bàn là bắt buộc")
    return this.tablesService.updateTableStatus(id, dto.status)
  }

  @Delete(":id")
  @RequirePermissions("table:manage")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa bàn — Admin/Manager" })
  async delete(@Param("id", ParseIntPipe) id: number) {
    await this.tablesService.deleteTable(id)
    return { statusCode: 200, message: `Đã xóa bàn #${id} thành công` }
  }
}
