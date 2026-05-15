import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'
import { UserRole } from '../entities/user.entity'

export class QueryUserDto {
  /** Tìm kiếm theo tên hoặc email */
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'role phải là: admin | manager | cashier | staff | barista',
  })
  role?: UserRole

  /**
   * Lọc theo trạng thái tài khoản.
   * Query string "true"/"false" → tự động chuyển thành boolean.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true')  return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean
}
