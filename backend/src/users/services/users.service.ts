import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateUserDto } from '../dto/create-user.dto'
import { UpdateUserDto } from '../dto/update-user.dto'
import { QueryUserDto } from '../dto/query-user.dto'
import { UsersRepository, type SafeUser } from '../repositories/users.repository'
import { hashPassword } from 'utils'

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // ─── CREATE ───────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<SafeUser> {
    // Kiểm tra trùng email
    const existing = await this.usersRepository.findOneByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Email đã được sử dụng')
    }

    // Hash password trước khi lưu
    const hashed = hashPassword(dto.password)

    return await this.usersRepository.createOne({ ...dto, password: hashed })
  }

  // ─── READ ─────────────────────────────────────────────────────────

  async findAll(query: QueryUserDto): Promise<SafeUser[]> {
    return await this.usersRepository.findAll(query)
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.usersRepository.findSafeById(id)
    if (!user) {
      throw new NotFoundException(`Nhân viên #${id} không tồn tại`)
    }
    return user
  }

  // ─── UPDATE ───────────────────────────────────────────────────────

  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    // Đảm bảo user tồn tại
    await this.findOne(id)

    // Kiểm tra email trùng nếu có thay đổi
    if (dto.email) {
      const existingEmail = await this.usersRepository.findOneByEmail(dto.email)
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email đã được sử dụng bởi nhân viên khác')
      }
    }

    // Hash password nếu có đổi
    const updateData: Record<string, unknown> = { ...dto }
    if (dto.password) {
      updateData.password = hashPassword(dto.password)
    }

    const updated = await this.usersRepository.updateOne(id, updateData as any)
    return updated!
  }

  // ─── DISABLE ──────────────────────────────────────────────────────

  /**
   * Vô hiệu hóa tài khoản — không xóa khỏi DB.
   * Giữ nguyên lịch sử order, ca làm việc để đảm bảo data integrity.
   * Tài khoản isActive = false sẽ bị chặn tại JwtAuthGuard khi đăng nhập.
   */
  async disable(id: number): Promise<SafeUser> {
    await this.findOne(id)
    const updated = await this.usersRepository.disableOne(id)
    return updated!
  }

  /**
   * Kích hoạt lại tài khoản đã bị khóa.
   */
  async enable(id: number): Promise<SafeUser> {
    await this.findOne(id)
    const updated = await this.usersRepository.updateOne(id, { isActive: true } as any)
    return updated!
  }
}
