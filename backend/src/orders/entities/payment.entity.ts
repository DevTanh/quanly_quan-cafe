import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { Order } from "./order.entity"

// ─── ENUMS ──────────────────────────────────────────────────────────

export enum PaymentMethod {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  PAYOS_QR = "payos_qr",
}

export enum PaymentStatus {
  /** Chờ thanh toán (QR chưa nhận tiền) */
  PENDING = "pending",
  /** Đã thanh toán thành công */
  PAID = "paid",
  /** Thanh toán thất bại hoặc hết hạn */
  FAILED = "failed",
  /** Payment link bị hủy */
  CANCELLED = "cancelled",
  /** Đang chờ phê duyệt hoàn tiền */
  REFUND_PENDING = "refund_pending",
  /** Đã hoàn tiền */
  REFUNDED = "refunded",
}

// ─── ENTITY ─────────────────────────────────────────────────────────

@Entity("payments")
@Index("idx_payment_order", ["orderId"])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "order_id", type: "int", unique: true })
  orderId: number

  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  method: PaymentMethod

  /** Tổng tiền phải thanh toán */
  @Column({ type: "decimal", precision: 12, scale: 0 })
  amount: number

  /** Số tiền khách đưa */
  @Column({ name: "received_amount", type: "decimal", precision: 12, scale: 0, default: 0 })
  receivedAmount: number

  /** Tiền thừa = receivedAmount - amount */
  @Column({ name: "change_amount", type: "decimal", precision: 12, scale: 0, default: 0 })
  changeAmount: number

  /** Nhân viên thực hiện thanh toán */
  @Column({ name: "paid_by", type: "int" })
  paidBy: number

  @Column({ type: "text", nullable: true })
  note?: string

  /** Trạng thái thanh toán (dùng cho QR / async / refund) */
  @Column({
    name: "payment_status",
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PAID,
  })
  paymentStatus: PaymentStatus

  // ─── PAYOS QR FIELDS ────────────────────────────────────────

  /** PayOS payment link ID */
  @Column({ name: "payment_link_id", type: "varchar", length: 200, nullable: true })
  paymentLinkId?: string

  /** URL trang thanh toán PayOS */
  @Column({ name: "checkout_url", type: "varchar", length: 500, nullable: true })
  checkoutUrl?: string

  /** Chuỗi QR code (VietQR data) */
  @Column({ name: "qr_code", type: "text", nullable: true })
  qrCode?: string

  /** Mã giao dịch ngân hàng (từ webhook) */
  @Column({ name: "transaction_ref", type: "varchar", length: 200, nullable: true })
  transactionRef?: string

  // ─── REFUND FIELDS ───────────────────────────────────────────

  /** Lý do yêu cầu hoàn tiền */
  @Column({ name: "refund_reason", type: "varchar", length: 500, nullable: true })
  refundReason?: string

  /** userId của người yêu cầu hoàn tiền */
  @Column({ name: "refund_requested_by", type: "int", nullable: true })
  refundRequestedBy?: number

  @Column({ name: "refund_requested_at", type: "datetime", nullable: true })
  refundRequestedAt?: Date

  /** userId của người phê duyệt hoàn tiền */
  @Column({ name: "refund_approved_by", type: "int", nullable: true })
  refundApprovedBy?: number

  @Column({ name: "refund_approved_at", type: "datetime", nullable: true })
  refundApprovedAt?: Date

  @CreateDateColumn({ name: "paid_at", type: "datetime" })
  paidAt: Date

  // ─── RELATIONS ──────────────────────────────────────────────

  @ManyToOne(() => Order)
  @JoinColumn({ name: "order_id" })
  order: Order
}
