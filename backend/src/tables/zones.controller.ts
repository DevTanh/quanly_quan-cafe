import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { TablesService } from "./services/tables.service"
import { CreateZoneDto } from "./dto/create-zone.dto"
import { UpdateZoneDto } from "./dto/update-zone.dto"
import { QueryZonesDto } from "./dto/query-zones.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@ApiTags("Zones")
@ApiCookieAuth()
@Controller("zones")
export class ZonesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Danh sách khu vực (include=tables để kèm bàn)" })
  findAll(@Query() query: QueryZonesDto) {
    return this.tablesService.findZones(query)
  }

  @Get(":id")
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Chi tiết khu vực" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.tablesService.findZoneById(id)
  }

  @Post()
  @RequirePermissions("table:manage")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo khu vực mới" })
  create(@Body() dto: CreateZoneDto) {
    return this.tablesService.createZone(dto)
  }

  @Patch(":id")
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Cập nhật khu vực" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.tablesService.updateZone(id, dto)
  }

  @Delete(":id")
  @RequirePermissions("table:manage")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa khu vực (chỉ khi không còn bàn active)" })
  async delete(@Param("id", ParseIntPipe) id: number) {
    await this.tablesService.deleteZone(id)
    return { statusCode: 200, message: `Đã xóa khu vực #${id} thành công` }
  }
}
