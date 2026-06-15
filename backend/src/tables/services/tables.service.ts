import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ZonesRepository } from "../repositories/zones.repository"
import { TablesRepository } from "../repositories/tables.repository"
import { Zone, ZoneStatus } from "../entities/zone.entity"
import { CafeTable, TableStatus } from "../entities/cafe-table.entity"
import type { QueryZonesDto } from "../dto/query-zones.dto"
import type { CreateZoneDto } from "../dto/create-zone.dto"
import type { UpdateZoneDto } from "../dto/update-zone.dto"
import type { CreateTableDto } from "../dto/create-table.dto"
import type { UpdateTableDto } from "../dto/update-table.dto"

@Injectable()
export class TablesService {
  constructor(
    private readonly zonesRepo: ZonesRepository,
    private readonly tablesRepo: TablesRepository,
  ) {}

  async findZones(query: QueryZonesDto) {
    const includeTables = query.include === "tables"
    const zones = await this.zonesRepo.findAll(includeTables)
    return zones.map((zone) => this.toZoneResponse(zone))
  }

  async findZoneById(id: number) {
    const zone = await this.zonesRepo.findById(id)
    if (!zone) throw new NotFoundException(`Zone #${id} không tồn tại`)
    return this.toZoneResponse(zone)
  }

  async createZone(dto: CreateZoneDto) {
    const zone = await this.zonesRepo.create({
      ...dto,
      status: ZoneStatus.ACTIVE,
    })
    return this.toZoneResponse(zone)
  }

  async updateZone(id: number, dto: UpdateZoneDto) {
    const existing = await this.zonesRepo.findById(id)
    if (!existing) throw new NotFoundException(`Zone #${id} không tồn tại`)

    const zone = await this.zonesRepo.update(id, dto)
    return this.toZoneResponse(zone!)
  }

  async deleteZone(id: number): Promise<void> {
    const existing = await this.zonesRepo.findById(id)
    if (!existing) throw new NotFoundException(`Zone #${id} không tồn tại`)

    // Kiểm tra nếu còn bàn active trong zone
    const activeTables = (existing.tables ?? []).filter(
      (t) => t.status === TableStatus.ACTIVE,
    )
    if (activeTables.length > 0) {
      throw new BadRequestException(
        `Không thể xóa khu vực còn ${activeTables.length} bàn đang hoạt động. Hãy xóa hoặc vô hiệu hóa tất cả bàn trước.`,
      )
    }

    await this.zonesRepo.delete(id)
  }

  async findTables() {
    const tables = await this.tablesRepo.findAll()
    return tables.map((table) => this.toTableResponse(table))
  }

  async findTableById(id: number) {
    const table = await this.tablesRepo.findById(id)
    if (!table) throw new NotFoundException(`Table #${id} không tồn tại`)
    return this.toTableResponse(table)
  }

  async createTable(dto: CreateTableDto) {
    const zone = await this.zonesRepo.findById(dto.zoneId)
    if (!zone) throw new NotFoundException(`Zone #${dto.zoneId} không tồn tại`)
    if (zone.status !== ZoneStatus.ACTIVE) {
      throw new BadRequestException("Không thể tạo bàn trong khu vực đã ngừng hoạt động")
    }

    const table = await this.tablesRepo.create({
      ...dto,
      status: TableStatus.ACTIVE,
    })
    return this.toTableResponse(table)
  }

  async updateTable(id: number, dto: UpdateTableDto) {
    const existing = await this.tablesRepo.findById(id)
    if (!existing) throw new NotFoundException(`Table #${id} không tồn tại`)

    if (dto.zoneId != null) {
      const zone = await this.zonesRepo.findById(dto.zoneId)
      if (!zone) throw new NotFoundException(`Zone #${dto.zoneId} không tồn tại`)
      if (zone.status !== ZoneStatus.ACTIVE) {
        throw new BadRequestException("Không thể chuyển bàn vào khu vực đã ngừng hoạt động")
      }
    }

    const table = await this.tablesRepo.update(id, dto)
    return this.toTableResponse(table!)
  }

  async updateTableStatus(id: number, status: TableStatus) {
    const existing = await this.tablesRepo.findById(id)
    if (!existing) throw new NotFoundException(`Table #${id} không tồn tại`)

    const table = await this.tablesRepo.update(id, { status })
    return this.toTableResponse(table!)
  }

  async deleteTable(id: number): Promise<void> {
    const existing = await this.tablesRepo.findById(id)
    if (!existing) throw new NotFoundException(`Table #${id} không tồn tại`)

    await this.tablesRepo.delete(id)
  }

  async findActiveTableById(id: number): Promise<CafeTable | null> {
    return await this.tablesRepo.findActiveById(id)
  }

  private toZoneResponse(zone: Zone) {
    return {
      id: String(zone.id),
      name: zone.name,
      note: zone.note ?? "",
      status: zone.status,
      tables: (zone.tables ?? []).map((table) => ({
        id: String(table.id),
        name: table.name,
        seats: table.seats,
        note: table.note ?? "",
        status: table.status,
      })),
    }
  }

  private toTableResponse(table: CafeTable) {
    return {
      id: String(table.id),
      zoneId: String(table.zoneId),
      name: table.name,
      seats: table.seats,
      note: table.note ?? "",
      status: table.status,
    }
  }
}
