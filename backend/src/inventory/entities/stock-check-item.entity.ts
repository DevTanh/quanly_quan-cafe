import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { StockCheck } from "./stock-check.entity"

@Entity("stock_check_items")
@Index("idx_stock_check_item_stock_check", ["stockCheckId"])
@Index("idx_stock_check_item_product", ["productId"])
export class StockCheckItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "stock_check_id", type: "int" })
  stockCheckId: number

  @Column({ name: "product_id", type: "int" })
  productId: number

  @Column({ name: "product_code", type: "varchar", length: 50 })
  productCode: string

  @Column({ name: "product_name", type: "varchar", length: 200 })
  productName: string

  @Column({ name: "category_name", type: "varchar", length: 100 })
  categoryName: string

  @Column({ name: "system_stock", type: "int" })
  systemStock: number

  @Column({ name: "actual_stock", type: "int" })
  actualStock: number

  @Column({ type: "int" })
  diff: number

  @Column({ type: "varchar", length: 255, nullable: true })
  note?: string

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date

  @ManyToOne(() => StockCheck, (stockCheck) => stockCheck.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_check_id" })
  stockCheck: StockCheck
}
