import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Zone } from "./entities/zone.entity"
import { CafeTable } from "./entities/cafe-table.entity"
import { ZonesRepository } from "./repositories/zones.repository"
import { TablesRepository } from "./repositories/tables.repository"
import { TablesService } from "./services/tables.service"
import { ZonesController } from "./zones.controller"
import { TablesController } from "./tables.controller"

@Module({
  imports: [TypeOrmModule.forFeature([Zone, CafeTable])],
  controllers: [ZonesController, TablesController],
  providers: [ZonesRepository, TablesRepository, TablesService],
  exports: [TablesService],
})
export class TablesModule {}
