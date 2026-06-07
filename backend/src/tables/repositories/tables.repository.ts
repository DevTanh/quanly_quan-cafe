import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { CafeTable, TableStatus } from "../entities/cafe-table.entity"
import { ZoneStatus } from "../entities/zone.entity"

@Injectable()
export class TablesRepository {
  constructor(
    @InjectRepository(CafeTable)
    private readonly repo: Repository<CafeTable>,
  ) {}

  async findAll(): Promise<CafeTable[]> {
    return await this.repo.find({
      relations: ["zone"],
      order: { createdAt: "ASC" },
    })
  }

  async findById(id: number): Promise<CafeTable | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["zone"],
    })
  }

  async findActiveById(id: number): Promise<CafeTable | null> {
    return await this.repo
      .createQueryBuilder("table")
      .leftJoinAndSelect("table.zone", "zone")
      .where("table.id = :id", { id })
      .andWhere("table.status = :tableStatus", { tableStatus: TableStatus.ACTIVE })
      .andWhere("zone.status = :zoneStatus", { zoneStatus: ZoneStatus.ACTIVE })
      .getOne()
  }

  async findByZone(zoneId: number): Promise<CafeTable[]> {
    return await this.repo.find({
      where: { zoneId },
      relations: ["zone"],
      order: { createdAt: "ASC" },
    })
  }

  async create(data: Partial<CafeTable>): Promise<CafeTable> {
    const entity = this.repo.create(data)
    return await this.repo.save(entity)
  }

  async update(id: number, data: Partial<CafeTable>): Promise<CafeTable | null> {
    await this.repo.update(id, data)
    return await this.findById(id)
  }
}
