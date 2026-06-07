import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm"
import { CafeTable } from "./cafe-table.entity"

export enum ZoneStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("zones")
@Index("idx_zone_status", ["status"])
export class Zone {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "varchar", length: 100 })
  name: string

  @Column({ type: "varchar", length: 255, nullable: true })
  note?: string

  @Column({
    type: "enum",
    enum: ZoneStatus,
    default: ZoneStatus.ACTIVE,
  })
  status: ZoneStatus

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date

  @OneToMany(() => CafeTable, (table) => table.zone)
  tables: CafeTable[]
}
