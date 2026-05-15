import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, ILike } from 'typeorm'
import { User, UserRole } from '../entities/user.entity'
import type { CreateUserDto } from '../dto/create-user.dto'
import type { UpdateUserDto } from '../dto/update-user.dto'
import type { QueryUserDto } from '../dto/query-user.dto'

/** Response shape trả về FE — không bao gồm password, tokenVersion */
export type SafeUser = Omit<User, 'password' | 'tokenVersion'>

@Injectable()
export class UsersRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(User)
  }

  // ─── FINDERS ────────────────────────────────────────────────────

  async findOneByEmail(email: string): Promise<User | null> {
    return await this.repo.findOne({ where: { email } })
  }

  async findOneById(id: number): Promise<User | null> {
    return await this.repo.findOne({ where: { id } })
  }

  /**
   * Lấy danh sách nhân viên, hỗ trợ search + filter theo role / isActive.
   * Không trả về password và tokenVersion.
   */
  async findAll(query: QueryUserDto): Promise<SafeUser[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.fullName',
        'u.email',
        'u.phone',
        'u.role',
        'u.isActive',
        'u.lastLoginAt',
        'u.createdAt',
        'u.updatedAt',
      ])
      .orderBy('u.createdAt', 'DESC')

    if (query.search) {
      qb.andWhere(
        '(u.fullName LIKE :q OR u.email LIKE :q)',
        { q: `%${query.search}%` },
      )
    }

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role })
    }

    if (query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive })
    }

    return await qb.getMany() as unknown as SafeUser[]
  }

  /**
   * Lấy 1 user (safe — không có password).
   */
  async findSafeById(id: number): Promise<SafeUser | null> {
    const user = await this.repo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.fullName',
        'u.email',
        'u.phone',
        'u.role',
        'u.isActive',
        'u.lastLoginAt',
        'u.createdAt',
        'u.updatedAt',
      ])
      .where('u.id = :id', { id })
      .getOne()

    return user as unknown as SafeUser | null
  }

  // ─── MUTATIONS ───────────────────────────────────────────────────

  /**
   * Tạo user mới.
   * Trả về SafeUser (không có password, tokenVersion).
   */
  async createOne(dto: CreateUserDto & { password: string }): Promise<SafeUser> {
    const user = this.repo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      role: dto.role,
      isActive: dto.isActive ?? false,
      tokenVersion: 0,
    })
    const saved = await this.repo.save(user)
    return this.toSafe(saved)
  }

  /**
   * Cập nhật thông tin nhân viên.
   * Trả về SafeUser sau khi update.
   */
  async updateOne(id: number, data: Partial<User>): Promise<SafeUser | null> {
    await this.repo.update(id, data)
    return await this.findSafeById(id)
  }

  /**
   * Vô hiệu hóa tài khoản (isActive = false).
   * Không xóa vật lý — giữ lịch sử đơn hàng, ca làm việc.
   */
  async disableOne(id: number): Promise<SafeUser | null> {
    await this.repo.update(id, { isActive: false })
    return await this.findSafeById(id)
  }

  // ─── AUTH HELPERS (dùng bởi AuthRepository) ─────────────────────

  async updateLastLogin(id: number): Promise<void> {
    await this.repo.update(id, { lastLoginAt: new Date() })
  }

  /** Tăng tokenVersion → invalidate toàn bộ access token cũ */
  async incrementTokenVersion(id: number): Promise<void> {
    await this.repo.increment({ id }, 'tokenVersion', 1)
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────

  private toSafe(user: User): SafeUser {
    const { password, tokenVersion, ...safe } = user
    return safe as SafeUser
  }
}
