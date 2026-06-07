import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiCookieAuth } from "@nestjs/swagger"
import { ReportsService } from "./services/reports.service"
import { QueryReportDto } from "./dto/query-report.dto"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@ApiTags("Reports")
@ApiCookieAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  @RequirePermissions("report:view_daily")
  @ApiOperation({ summary: "Báo cáo tổng quan dashboard" })
  getDashboard(@Query() query: QueryReportDto) {
    return this.reportsService.getDashboard(query)
  }
}
