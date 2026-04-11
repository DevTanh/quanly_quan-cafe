import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { AuthService } from "./services/auth.service"
import { LoginUserDto } from "./dto/login-user.dto"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { CurrentUser } from "./decorators/current-user.decorator"
import type { JwtPayload } from "./guards/jwt-auth.guard"
import { Public } from "./decorators/public.decorator"
import { RequirePermissions } from "../permissions/decorators/permissions.decorator"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * POST /auth/login
   * Body: { email, password, deviceId?, deviceName? }
   */
  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.login(dto, req, res)
  }

  /**
   * POST /auth/refresh
   * Reads access_token + refresh_token from HTTP-only cookie.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.refresh(req, res)
  }

  /**
   * POST /auth/logout — không cần access token hợp lệ để logout.
   */
  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.logout(req, res)
  }

  /**
   * POST /auth/logout-all
   * Revokes ALL sessions for the authenticated user (requires valid access token).
   */
  @RequirePermissions("auth:logout_all")
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.logoutAll(user.sub, res)
  }

  // ──────────────────────────────────────────────
  // Device / Session management (own)
  // ──────────────────────────────────────────────

  /**
   * GET /auth/devices
   * Lấy danh sách thiết bị đang đăng nhập của chính mình.
   */
  @RequirePermissions("auth:view_devices")
  @Get("devices")
  async getOwnDevices(@CurrentUser() user: JwtPayload) {
    const devices = await this.authService.getDevices(user.sub)
    return { message: "Devices retrieved", data: devices }
  }

  /**
   * DELETE /auth/devices/:sessionId
   * Thu hồi 1 session/device cụ thể của chính mình.
   */
  @RequirePermissions("auth:revoke_device")
  @Delete("devices/:sessionId")
  @HttpCode(HttpStatus.OK)
  async revokeOwnDevice(
    @CurrentUser() user: JwtPayload,
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ) {
    return this.authService.forceLogoutDevice(user.sub, sessionId)
  }

  // ──────────────────────────────────────────────
  // Force logout (Admin only)
  // ──────────────────────────────────────────────

  /**
   * POST /auth/force-logout/:userId
   * Admin thu hồi TOÀN BỘ session của một user (force logout).
   * Tăng tokenVersion → invalidate access token ngay lập tức.
   */
  @RequirePermissions("user:revoke_token")
  @Post("force-logout/:userId")
  @HttpCode(HttpStatus.OK)
  async forceLogout(@Param("userId", ParseIntPipe) userId: number) {
    return this.authService.forceLogout(userId)
  }

  /**
   * GET /auth/devices/user/:userId
   * Admin xem danh sách thiết bị đang đăng nhập của một user bất kỳ.
   */
  @RequirePermissions("user:view_auth_logs")
  @Get("devices/user/:userId")
  async getUserDevices(@Param("userId", ParseIntPipe) userId: number) {
    const devices = await this.authService.getDevices(userId)
    return { message: "Devices retrieved", data: devices }
  }

  /**
   * DELETE /auth/force-logout/:userId/device/:sessionId
   * Admin thu hồi 1 thiết bị cụ thể của user.
   */
  @RequirePermissions("user:revoke_token")
  @Delete("force-logout/:userId/device/:sessionId")
  @HttpCode(HttpStatus.OK)
  async forceLogoutDevice(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ) {
    return this.authService.forceLogoutDevice(userId, sessionId)
  }
  /**
 * GET /auth/me
 * Lấy thông tin user hiện tại từ access token (cookie)
 */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    return { user };
  }
}
