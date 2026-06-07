import { Injectable, BadRequestException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as crypto from "crypto"

export interface PayOSPaymentLink {
  paymentLinkId: string
  checkoutUrl: string
  qrCode: string
}

export interface PayOSWebhookData {
  orderCode: number
  amount: number
  description: string
  accountNumber?: string
  reference?: string
  transactionDateTime?: string
  paymentLinkId: string
}

export interface PayOSWebhookPayload {
  code: string
  desc: string
  data: PayOSWebhookData
  signature: string
}

export interface PayOSPaymentLinkInfo {
  code: string
  desc?: string
  data?: Record<string, unknown>
}

@Injectable()
export class PayosService {
  private readonly clientId: string
  private readonly apiKey: string
  private readonly checksumKey: string
  private readonly baseUrl = "https://api-merchant.payos.vn"

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("PAYOS_CLIENT_ID") ?? ""
    this.apiKey = this.configService.get<string>("PAYOS_API_KEY") ?? ""
    this.checksumKey = this.configService.get<string>("PAYOS_CHECKSUM_KEY") ?? ""
  }

  /**
   * Tạo payment link QR động qua PayOS.
   * Docs: https://payos.vn/docs/api/payment-requests/create
   */
  async createPaymentLink(
    orderCode: number,
    amount: number,
    description: string,
    cancelUrl: string,
    returnUrl: string,
  ): Promise<PayOSPaymentLink> {
    if (!this.clientId || !this.apiKey || !this.checksumKey) {
      throw new BadRequestException(
        "PayOS chưa được cấu hình. Vui lòng kiểm tra PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY.",
      )
    }

    // Tạo checksum theo spec PayOS: sort data fields alphabetically, join with &, HMAC SHA256
    const checksumData = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`
    const signature = crypto
      .createHmac("sha256", this.checksumKey)
      .update(checksumData)
      .digest("hex")

    const body = {
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
      signature,
    }

    const response = await fetch(`${this.baseUrl}/v2/payment-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": this.clientId,
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (result.code !== "00" || !result.data) {
      throw new BadRequestException(
        `PayOS tạo payment link thất bại: ${result.desc ?? "Unknown error"}`,
      )
    }

    return {
      paymentLinkId: result.data.paymentLinkId,
      checkoutUrl: result.data.checkoutUrl,
      qrCode: result.data.qrCode,
    }
  }

  /**
   * Hủy payment link.
   * Docs: https://payos.vn/docs/api/payment-requests/cancel
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/v2/payment-requests/${paymentLinkId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.clientId,
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({ cancellationReason: "User cancelled" }),
      },
    )

    const result = await response.json()
    if (result.code !== "00") {
      throw new BadRequestException(
        `PayOS hủy payment link thất bại: ${result.desc ?? "Unknown error"}`,
      )
    }
  }

  /**
   * Lấy thông tin payment link (dùng để kiểm tra thủ công).
   */
  async getPaymentLink(paymentLinkId: string): Promise<PayOSPaymentLinkInfo> {
    const response = await fetch(
      `${this.baseUrl}/v2/payment-requests/${paymentLinkId}`,
      {
        method: "GET",
        headers: {
          "x-client-id": this.clientId,
          "x-api-key": this.apiKey,
        },
      },
    )
    return await response.json()
  }

  /**
   * Xác minh signature từ webhook PayOS.
   * Trả true nếu chữ ký hợp lệ.
   */
  verifyWebhookSignature(payload: PayOSWebhookPayload): boolean {
    if (!this.checksumKey) return false

    // ── Validate: guard thiếu trường trước khi dùng ────────────────────
    if (!payload || !payload.data || typeof payload.signature !== "string") {
      return false
    }

    const { data, signature } = payload

    // PayOS webhook signature: sort data fields alphabetically, join with &, HMAC SHA256
    const sortedKeys = Object.keys(data).sort()
    const checksumData = sortedKeys
      .map((key) => `${key}=${(data as unknown as Record<string, unknown>)[key] ?? ""}`)
      .join("&")

    const computed = crypto
      .createHmac("sha256", this.checksumKey)
      .update(checksumData)
      .digest("hex")

    return computed === signature
  }
}
