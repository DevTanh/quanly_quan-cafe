import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from "typeorm"
import { StockCheckItem } from "./stock-check-item.entity"

@Entity("stock_checks")
@Index("idx_stock_check_code", ["code"], { unique: true })
@Index("idx_stock_check_checked_by", ["checkedBy"])
export class StockCheck {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "varchar", length: 50, unique: true })
  code: string

  @Column({ name: "checker_name", type: "varchar", length: 100 })
  checkerName: string

  @Column({ name: "checked_by", type: "int" })
  checkedBy: number

  @Column({ name: "total_items", type: "int", default: 0 })
  totalItems: number

  @Column({ name: "total_diff", type: "int", default: 0 })
  totalDiff: number

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date

  @OneToMany(() => StockCheckItem, (item) => item.stockCheck)
  items: StockCheckItem[]
}
