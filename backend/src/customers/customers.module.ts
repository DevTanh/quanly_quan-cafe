import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Customer } from "./entities/customer.entity"
import { CustomersRepository } from "./repositories/customers.repository"
import { CustomersService } from "./services/customers.service"
import { CustomersController } from "./customers.controller"

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomersController],
  providers: [CustomersRepository, CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
