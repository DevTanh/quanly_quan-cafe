// Đặt tại: src/app.module.ts

import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { UsersModule } from "./users/users.module"
import { AuthModule } from "./auth/auth.module"
import { PermissionsModule } from "./permissions/permissions.module"
import { ShiftsModule } from "./shifts/shifts.module"
import { ProductsModule } from "./products/products.module"
import { OrdersModule } from "./orders/orders.module"
import { TablesModule } from "./tables/tables.module"
import { InventoryModule } from "./inventory/inventory.module"
import { ReportsModule } from "./reports/reports.module"
import { CustomersModule } from "./customers/customers.module"
import { QrOrderModule } from "./qr-order/qr-order.module"
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "./permissions/guards/permissions.guard"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get<string>("DB_HOST"),
        port: Number(configService.get("DB_PORT")),
        username: configService.get<string>("DB_USER"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_NAME"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true,
        extra: { connectionLimit: 10 },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PermissionsModule,
    ShiftsModule,
    ProductsModule,
    OrdersModule,
    TablesModule,
    InventoryModule,
    ReportsModule,
    CustomersModule,
    QrOrderModule,    // ← Module QR Gọi món — public endpoints, không cần auth
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard 1: Xác thực JWT (chạy trước)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard 2: Kiểm tra permission (chạy sau khi đã xác thực)
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }