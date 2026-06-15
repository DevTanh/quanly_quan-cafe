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
  @ApiOperation({ summary: "Báo cáo tổng quan dashboard — KPI, top sản phẩm, tồn kho thấp" })
  getDashboard(@Query() query: QueryReportDto) {
    return this.reportsService.getDashboard(query)
  }

  @Get("revenue")
  @RequirePermissions("report:view_full")
  @ApiOperation({ summary: "Báo cáo doanh thu theo ngày trong khoảng thời gian" })
  getRevenue(@Query() query: QueryReportDto) {
    return this.reportsService.getRevenueReport(query)
  }

  @Get("shift")
  @RequirePermissions("report:view_shift")
  @ApiOperation({ summary: "Báo cáo theo ca — phân bổ doanh thu theo giờ, top sản phẩm" })
  getShift(@Query() query: QueryReportDto) {
    return this.reportsService.getShiftReport(query)
  }
}
