import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { UsersService } from './services/users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { QueryUserDto } from './dto/query-user.dto'
import { RequirePermissions } from '../permissions/decorators/permissions.decorator'

@ApiTags('Users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * Tạo tài khoản nhân viên mới.
   * Chỉ Admin (user:create).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên — Admin' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }

  /**
   * GET /users
   * Danh sách nhân viên, hỗ trợ ?search=&role=&isActive=
   * Admin + Manager (user:view_list).
   */
  @Get()
  @RequirePermissions('user:view_list')
  @ApiOperation({ summary: 'Danh sách nhân viên (search/filter) — Admin, Manager' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query)
  }

  /**
   * GET /users/:id
   * Chi tiết một nhân viên.
   * Admin + Manager (user:view_detail).
   */
  @Get(':id')
  @RequirePermissions('user:view_detail')
  @ApiOperation({ summary: 'Chi tiết nhân viên — Admin, Manager' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id)
  }

  /**
   * PATCH /users/:id
   * Cập nhật thông tin nhân viên (fullName, email, phone, role, password).
   * Chỉ Admin (user:update).
   */
  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên — Admin' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto)
  }

  /**
   * PATCH /users/:id/disable
   * Khóa tài khoản (isActive = false).
   * Tài khoản bị khóa không thể đăng nhập, access token hiện tại vẫn còn
   * hiệu lực cho đến khi hết hạn — dùng /auth/force-logout/:id để thu hồi ngay.
   * Chỉ Admin (user:disable).
   */
  @Patch(':id/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:disable')
  @ApiOperation({ summary: 'Khóa tài khoản nhân viên — Admin' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.disable(id)
  }

  /**
   * PATCH /users/:id/enable
   * Mở lại tài khoản (isActive = true).
   * Chỉ Admin (user:disable — dùng chung permission).
   */
  @Patch(':id/enable')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:disable')
  @ApiOperation({ summary: 'Mở khóa tài khoản nhân viên — Admin' })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.enable(id)
  }
}
