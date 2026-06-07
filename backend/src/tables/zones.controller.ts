import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from "@nestjs/common"
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
  @ApiOperation({ summary: "Danh sach khu vuc" })
  findAll(@Query() query: QueryZonesDto) {
    return this.tablesService.findZones(query)
  }

  @Get(":id")
  @RequirePermissions("table:view")
  @ApiOperation({ summary: "Chi tiet khu vuc" })
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.tablesService.findZoneById(id)
  }

  @Post()
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Tao khu vuc" })
  create(@Body() dto: CreateZoneDto) {
    return this.tablesService.createZone(dto)
  }

  @Patch(":id")
  @RequirePermissions("table:manage")
  @ApiOperation({ summary: "Cap nhat khu vuc" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.tablesService.updateZone(id, dto)
  }
}
