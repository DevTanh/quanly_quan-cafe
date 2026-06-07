import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
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
  @ApiOperation({ summary: "Danh sach ban" })
  findAll() {
    return this.tablesService.findTables()
  }

  @Get(":id")
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Chi tiet ban" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.tablesService.findTableById(id)
  }

  @Post()
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Tao ban" })
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto)
  }

  @Patch(":id")
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Cap nhat ban" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(id, dto)
  }

  @Patch(":id/status")
  @RequirePermissions("table:update_status")
  @ApiOperation({ summary: "Cap nhat trang thai ban" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    if (!dto.status) throw new BadRequestException("Trang thai ban la bat buoc")
    return this.tablesService.updateTableStatus(id, dto.status)
  }
}
