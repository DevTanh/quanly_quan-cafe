import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import * as crypto from "crypto"
import { UsersRepository } from "../../users/repositories/users.repository"
import { SessionRepository } from "../repositories/session.repository"
import { LoginUserDto } from "../dto/login-user.dto"
import { comparePassword } from "utils"
import { JwtPayload } from "../guards/jwt-auth.guard"
import { Request, Response } from "express"
import * as bcrypt from 'bcrypt'
const ACCESS_TOKEN_COOKIE = "access_token"
const REFRESH_TOKEN_COOKIE = "refresh_token"
const REFRESH_TOKEN_BYTES = 32 // 32 bytes → 64 hex chars
const REFRESH_TOKEN_TTL_DAYS = 7

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }

  // PUBLIC METHODS

  /**
   * Đăng nhập: xác thực user, tạo access + refresh token, lưu session, trả về cookie
   * Trả về thông tin user (không bao gồm token) để client hiển thị
   */

  async login(dto: LoginUserDto, req: Request, res: Response) {
    // 1. Xác thực email & password
    const user = await this.usersRepository.findOneByEmail(dto.email)

    if (user) {
      console.log('manual compare:', bcrypt.compareSync('12345678', user.password))
    }
    if (!user || !comparePassword(dto.password, user.password)) {
      throw new UnauthorizedException("Invalid email or password")
    }

    if (!user.isActive) {
      throw new ForbiddenException("Account is not active")
    }

    // 2. Tạo refresh token mới và lưu hash vào DB
    const refreshToken = this.generateRefreshToken()
    const refreshTokenHash = this.hashToken(refreshToken)
    const expiresAt = this.refreshTokenExpiry()

    // Nếu client không gửi deviceId thì sinh ngẫu nhiên dựa trên User-Agent + IP (device fingerprint) để dùng làm identifier cho session. 
    // Việc này giúp tăng khả năng tương thích với các client đơn giản hoặc khi client không muốn/cannot generate deviceId.
    const deviceId = dto.deviceId ?? this.fingerprintDevice(req)

    // Upsert session: nếu đã tồn tại session cho (userId, deviceId) thì cập nhật, nếu chưa thì tạo mới
    // Điều này cho phép user đăng nhập từ cùng 1 thiết bị mà không bị tạo session trùng lặp, đồng thời vẫn hỗ trợ nhiều thiết bị khác nhau.
    const ua = req.headers["user-agent"]
    const deviceName = dto.deviceName ?? this.parseDeviceName(ua)

    console.log("DeviceName: ", deviceName);

    await this.sessionRepository.upsert({
      userId: user.id,
      refreshTokenHash,
      deviceId,
      deviceName,
      userAgent: ua,
      ipAddress: this.getIp(req),
      expiresAt,
    })

    // Cập nhật last_login_at
    await this.usersRepository.updateLastLogin(user.id)

    // 3. Tạo access token (JWT ngắn hạn) và ghi cả 2 vào HTTP-only cookie
    const accessToken = this.signAccessToken(
      user.id,
      user.role,
      user.tokenVersion
    )
    this.setAccessCookie(res, accessToken)
    this.setRefreshCookie(res, refreshToken, expiresAt)

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    }
  }

  /**
   * Làm mới access token bằng refresh token trong cookie.
   * Áp dụng refresh token rotation: issue refresh token mới mỗi lần.
   * Nếu phát hiện refresh token đã bị revoke (trùng hash nhưng isRevoked = true) → revoke toàn bộ session trên thiết bị đó để phòng trường hợp token bị đánh cắp và sử dụng lại.
   */
  async refresh(req: Request, res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (!rawToken) {
      throw new UnauthorizedException("Refresh token is missing")
    }

    // Hash của refresh token được lưu trong DB, không lưu token gốc để tăng cường bảo mật
    const hash = this.hashToken(rawToken)
    const session = await this.sessionRepository.findActiveByTokenHash(hash)

    // Nếu không tìm thấy session tương ứng với hash hoặc session đã bị revoke → lỗi
    if (!session) {
      throw new UnauthorizedException("Refresh token is invalid or revoked")
    }

    if (session.isRevoked) {
      await this.sessionRepository.revokeByTokenHash(hash) // Revoke ngay nếu phát hiện token đã bị revoke (phòng trường hợp token bị đánh cắp và sử dụng lại)
      this.clearAuthCookies(res)
      throw new UnauthorizedException(
        "Refresh token reuse detected. All sessions on this device have been revoked."
      )
    }

    // Kiểm tra expiration của refresh token
    // Nếu refresh token đã hết hạn → revoke session và yêu cầu đăng nhập lại
    if (session.expiresAt < new Date()) {
      await this.sessionRepository.revokeByTokenHash(hash)
      this.clearAuthCookies(res)
      throw new UnauthorizedException("Refresh token has expired")
    }

    // Lấy thông tin user
    const user = await this.usersRepository.findOneById(session.userId)
    if (!user || !user.isActive) {
      throw new ForbiddenException("User not found or inactive")
    }

    // Rotation: tạo refresh token mới
    const newRefreshToken = this.generateRefreshToken()
    const newHash = this.hashToken(newRefreshToken)
    const newExpiry = this.refreshTokenExpiry()

    await this.sessionRepository.upsert({
      userId: user.id,
      refreshTokenHash: newHash,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      userAgent: req.headers["user-agent"] ?? session.userAgent,
      ipAddress: this.getIp(req) ?? session.ipAddress,
      expiresAt: newExpiry,
    })

    const accessToken = this.signAccessToken(
      user.id,
      user.role,
      user.tokenVersion
    )
    this.setAccessCookie(res, accessToken)
    this.setRefreshCookie(res, newRefreshToken, newExpiry)

    return { message: "Token refreshed" }
  }

  /**
   * Đăng xuất: revoke session tương ứng với refresh token trong cookie.
   */
  async logout(req: Request, res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE]

    if (rawToken) {
      const hash = this.hashToken(rawToken)
      await this.sessionRepository.revokeByTokenHash(hash)
    }

    this.clearAuthCookies(res)
    return { message: "Logged out successfully" }
  }

  /**
   * Đăng xuất toàn bộ thiết bị (revoke tất cả sessions của user).
   */
  async logoutAll(userId: number, res: Response) {
    await this.sessionRepository.revokeAllByUserId(userId)
    this.clearAuthCookies(res)
    return { message: "Logged out from all devices" }
  }

  /**
   * Force logout: Admin/Manager thu hồi toàn bộ session của một user khác.
   * Tăng tokenVersion để invalidate mọi access token đang lưu hành.
   */
  async forceLogout(targetUserId: number) {
    const user = await this.usersRepository.findOneById(targetUserId)
    if (!user) {
      throw new NotFoundException(`User #${targetUserId} not found`)
    }

    // Revoke toàn bộ refresh sessions
    await this.sessionRepository.revokeAllByUserId(targetUserId)

    // Tăng tokenVersion → mọi access token cũ sẽ bị invalidate khi guard check
    await this.usersRepository.incrementTokenVersion(targetUserId)

    return {
      message: `All sessions of user #${targetUserId} have been revoked`,
    }
  }

  /**
   * Force logout một thiết bị cụ thể của user.
   */
  async forceLogoutDevice(targetUserId: number, sessionId: number) {
    const user = await this.usersRepository.findOneById(targetUserId)
    if (!user) {
      throw new NotFoundException(`User #${targetUserId} not found`)
    }

    const revoked = await this.sessionRepository.revokeSessionById(
      sessionId,
      targetUserId,
    )
    if (!revoked) {
      throw new NotFoundException(
        `Active session #${sessionId} not found for user #${targetUserId}`,
      )
    }

    return {
      message: `Session #${sessionId} of user #${targetUserId} has been revoked`,
    }
  }

  /**
   * Lấy danh sách thiết bị đang đăng nhập của một user.
   */
  async getDevices(userId: number) {
    const sessions = await this.sessionRepository.findActiveByUserId(userId)
    return sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
    }))
  }
  async getMe(userId: number) {
  const user = await this.usersRepository.findOneById(userId);
  if (!user) {
    throw new NotFoundException(`User #${userId} not found`);
  }
  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}
  // ──────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────

  private signAccessToken(
    userId: number,
    role: string,
    tokenVersion: number
  ): string {
    const payload: JwtPayload = { sub: userId, role, tokenVersion }
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_TOKEN_SECRET_KEY"),
      expiresIn: (this.configService.get<string>(
        "JWT_ACCESS_TOKEN_EXPIRES_IN"
      ) ?? "15m") as any,
    })
  }

  /** Sinh 32 random bytes → hex string (64 ký tự) */
  private generateRefreshToken(): string {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex")
  }

  /** SHA-256 hash → hex string (64 ký tự) */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex")
  }

  private refreshTokenExpiry(): Date {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_TTL_DAYS)
    return expiry
  }

  private setAccessCookie(res: Response, token: string): void {
    const expiresIn =
      this.configService.get<string>("JWT_ACCESS_TOKEN_EXPIRES_IN") ?? "15m"
    // Parse "15m" / "1h" / "7d" thành milliseconds
    const ms = this.parseDuration(expiresIn)
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.cookieOptions(),
      expires: new Date(Date.now() + ms),
    })
  }

  private setRefreshCookie(res: Response, token: string, expires: Date): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.cookieOptions(),
      expires,
    })
  }

  private clearAuthCookies(res: Response): void {
    const opts = this.cookieOptions()
    res.clearCookie(ACCESS_TOKEN_COOKIE, opts)
    res.clearCookie(REFRESH_TOKEN_COOKIE, opts)
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get("NODE_ENV") === "production",
      sameSite: "strict" as const,
      path: "/",
    }
  }

  /** Chuyển chuỗi duration "15m" / "1h" / "7d" → milliseconds */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) return 15 * 60 * 1000 // fallback 15m
    const value = parseInt(match[1])
    const unit = match[2]
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }
    return value * multipliers[unit]
  }

  private getIp(req: Request): string | undefined {
    const forwarded = req.headers["x-forwarded-for"]
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]
    }
    return req.socket?.remoteAddress
  }

  /**
   * Sinh device fingerprint phía server từ User-Agent + IP.
   * Dùng làm fallback khi client không gửi deviceId.
   */
  private fingerprintDevice(req: Request): string {
    const ua = req.headers["user-agent"] ?? "unknown"
    const ip = this.getIp(req) ?? "unknown"
    return crypto
      .createHash("sha256")
      .update(`${ua}|${ip}`)
      .digest("hex")
      .slice(0, 32)
  }

  /**
   * Phân tích User-Agent string → tên thiết bị dễ đọc.
   * Ví dụ: "Chrome 122 trên Windows 10", "Safari trên iPhone (iOS 17)"
   */
  private parseDeviceName(ua: string | undefined): string {
    if (!ua) return "Unknown Device"

    // ── HỆ ĐIỀU HÀNH ──────────────────────────────────────────
    let os = "Unknown OS"
    if (/Windows NT 10\.0/.test(ua)) os = "Windows 10/11"
    else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1"
    else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7"
    else if (/Windows/.test(ua)) os = "Windows"
    else if (/iPhone/.test(ua)) {
      const v = ua.match(/OS (\d+)_/)
      os = v ? `iPhone (iOS ${v[1]})` : "iPhone"
    } else if (/iPad/.test(ua)) {
      const v = ua.match(/OS (\d+)_/)
      os = v ? `iPad (iOS ${v[1]})` : "iPad"
    } else if (/Android/.test(ua)) {
      const v = ua.match(/Android ([\d.]+)/)
      os = v ? `Android ${v[1]}` : "Android"
    } else if (/Mac OS X/.test(ua)) {
      const v = ua.match(/Mac OS X (\d+)[_.]?(\d+)?/)
      os = v ? `macOS ${v[1]}.${v[2] ?? "0"}` : "macOS"
    } else if (/Linux/.test(ua)) os = "Linux"
    else if (/CrOS/.test(ua)) os = "ChromeOS"

    // ── TRÌNH DUYỆT ───────────────────────────────────────────
    let browser = "Unknown Browser"
    // Thứ tự quan trọng: Edge/OPR phải check trước Chrome
    if (/Edg\/([\d.]+)/.test(ua)) {
      const v = ua.match(/Edg\/([\d]+)/)
      browser = v ? `Edge ${v[1]}` : "Edge"
    } else if (/OPR\/([\d]+)/.test(ua)) {
      const v = ua.match(/OPR\/([\d]+)/)
      browser = v ? `Opera ${v[1]}` : "Opera"
    } else if (/Chrome\/([\d]+)/.test(ua)) {
      const v = ua.match(/Chrome\/([\d]+)/)
      browser = v ? `Chrome ${v[1]}` : "Chrome"
    } else if (/Firefox\/([\d]+)/.test(ua)) {
      const v = ua.match(/Firefox\/([\d]+)/)
      browser = v ? `Firefox ${v[1]}` : "Firefox"
    } else if (/Version\/[\d.]+ Safari/.test(ua)) {
      const v = ua.match(/Version\/([\d]+)/)
      browser = v ? `Safari ${v[1]}` : "Safari"
    } else if (/PostmanRuntime/.test(ua)) browser = "Postman"
    else if (/insomnia/.test(ua)) browser = "Insomnia"
    else if (/curl/.test(ua)) browser = "cURL"

    return `${browser} trên ${os}`
  }
}
