import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { Zone } from "./zone.entity"

export enum TableStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("cafe_tables")
@Index("idx_table_zone", ["zoneId"])
@Index("idx_table_status", ["status"])
export class CafeTable {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "zone_id", type: "int" })
  zoneId: number

  @Column({ type: "varchar", length: 100 })
  name: string

  @Column({ type: "int" })
  seats: number

  @Column({ type: "varchar", length: 255, nullable: true })
  note?: string

  @Column({
    type: "enum",
    enum: TableStatus,
    default: TableStatus.ACTIVE,
  })
  status: TableStatus

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date

  @ManyToOne(() => Zone, (zone) => zone.tables, { onDelete: "CASCADE" })
  @JoinColumn({ name: "zone_id" })
  zone: Zone
}
