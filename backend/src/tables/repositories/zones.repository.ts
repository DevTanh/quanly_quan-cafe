import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Zone } from "../entities/zone.entity"

@Injectable()
export class ZonesRepository {
  constructor(
    @InjectRepository(Zone)
    private readonly repo: Repository<Zone>,
  ) {}

  async findAll(includeTables: boolean): Promise<Zone[]> {
    if (!includeTables) {
      return await this.repo.find({
        order: { createdAt: "ASC" },
      })
    }

    return await this.repo
      .createQueryBuilder("zone")
      .leftJoinAndSelect("zone.tables", "tables")
      .orderBy("zone.createdAt", "ASC")
      .addOrderBy("tables.id", "ASC")
      .getMany()
  }

  async findById(id: number): Promise<Zone | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["tables"],
    })
  }

  async create(data: Partial<Zone>): Promise<Zone> {
    const entity = this.repo.create(data)
    return await this.repo.save(entity)
  }

  async update(id: number, data: Partial<Zone>): Promise<Zone | null> {
    await this.repo.update(id, data)
    return await this.findById(id)
  }
}
