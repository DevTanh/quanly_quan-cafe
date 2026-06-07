import { DataSource } from "typeorm"
import { Zone, ZoneStatus } from "../tables/entities/zone.entity"
import { CafeTable, TableStatus } from "../tables/entities/cafe-table.entity"

const SEED_TARGET_ROWS = 100

async function seedTables() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config()

  const dataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "quanly_quan_cafe",
    entities: [Zone, CafeTable],
    synchronize: false,
  })

  await dataSource.initialize()
  console.log("Database connected")

  const zoneRepo = dataSource.getRepository(Zone)
  const tableRepo = dataSource.getRepository(CafeTable)
  const baseZoneNames = ["Tang 1", "Tang 2", "San vuon"]

  let zonesCreated = 0
  let tablesCreated = 0

  for (const name of baseZoneNames) {
    const existing = await zoneRepo.findOne({ where: { name } })
    if (existing) continue

    await zoneRepo.save(
      zoneRepo.create({
        name,
        note: "",
        status: ZoneStatus.ACTIVE,
      }),
    )
    zonesCreated++
  }

  let zoneTotal = await zoneRepo.count()
  let zoneIndex = baseZoneNames.length + 1

  while (zoneTotal < SEED_TARGET_ROWS) {
    const name = `Demo Zone ${String(zoneIndex).padStart(3, "0")}`
    const existing = await zoneRepo.findOne({ where: { name } })
    if (!existing) {
      await zoneRepo.save(
        zoneRepo.create({
          name,
          note: "",
          status: ZoneStatus.ACTIVE,
        }),
      )
      zonesCreated++
      zoneTotal++
    }
    zoneIndex++
  }

  const zones = await zoneRepo.find({ order: { id: "ASC" } })
  let tableTotal = await tableRepo.count()
  let tableIndex = 1

  while (tableTotal < SEED_TARGET_ROWS && zones.length) {
    const zone = zones[(tableIndex - 1) % zones.length]
    const name = `Demo Table ${String(tableIndex).padStart(3, "0")}`
    const existing = await tableRepo.findOne({
      where: {
        zoneId: zone.id,
        name,
      },
    })

    if (!existing) {
      await tableRepo.save(
        tableRepo.create({
          zoneId: zone.id,
          name,
          seats: 2 + (tableIndex % 5) * 2,
          note: "",
          status: TableStatus.ACTIVE,
        }),
      )
      tablesCreated++
      tableTotal++
    }
    tableIndex++
  }

  console.log(`Zones created: ${zonesCreated}`)
  console.log(`Tables created: ${tablesCreated}`)

  await dataSource.destroy()
  console.log("Done")
}

seedTables().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
