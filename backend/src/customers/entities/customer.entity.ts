import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm"

@Entity("customers")
@Index("idx_customer_phone", ["phone"], { unique: true })
@Index("idx_customer_email", ["email"])
export class Customer {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "full_name", type: "varchar", length: 100 })
  fullName: string

  @Column({ type: "varchar", length: 20, unique: true })
  phone: string

  @Column({ type: "varchar", length: 100, nullable: true })
  email?: string

  /** Điểm tích lũy */
  @Column({ type: "int", default: 0 })
  points: number

  /** Ghi chú nội bộ */
  @Column({ type: "varchar", length: 500, nullable: true })
  note?: string

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date
}
