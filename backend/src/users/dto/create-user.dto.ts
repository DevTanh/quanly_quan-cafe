import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  Length,
  MinLength,
} from 'class-validator'
import { UserRole } from '../entities/user.entity'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @Length(2, 100)
  fullName: string

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Length(5, 100)
  email: string

  @IsOptional()
  @IsString()
  @Length(9, 15)
  phone?: string

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password: string

  @IsEnum(UserRole, {
    message: 'role phải là: admin | manager | cashier | staff | barista',
  })
  role: UserRole

  /**
   * Tài khoản kích hoạt ngay khi tạo hay không.
   * Mặc định false — Admin cần bật thủ công sau khi cấp thông tin cho nhân viên.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
