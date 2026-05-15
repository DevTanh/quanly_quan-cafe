import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  Length,
  MinLength,
} from 'class-validator'
import { UserRole } from '../entities/user.entity'

/**
 * DTO cập nhật thông tin nhân viên.
 * Tất cả field đều optional — chỉ gửi field muốn đổi.
 * Không extend CreateUserDto vì password cần xử lý riêng khi hash.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string

  @IsOptional()
  @IsEmail()
  @Length(5, 100)
  email?: string

  @IsOptional()
  @IsString()
  @Length(9, 15)
  phone?: string

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'role phải là: admin | manager | cashier | staff | barista',
  })
  role?: UserRole

  /**
   * Khóa / mở tài khoản.
   * Tài khoản isActive = false sẽ không thể đăng nhập.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  /**
   * Đổi mật khẩu (tùy chọn — chỉ hash khi có giá trị).
   */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password?: string
}
