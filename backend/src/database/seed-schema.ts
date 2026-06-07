import { DataSource } from "typeorm"
import { SEED_ENTITIES } from "./seed-entities"

function dbConfig() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config()

  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "quanly_quan_cafe",
  }
}

async function ensureDatabaseExists(config: ReturnType<typeof dbConfig>) {
  const serverDataSource = new DataSource({
    type: "mysql",
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
  })

  await serverDataSource.initialize()
  await serverDataSource.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await serverDataSource.destroy()
}

async function seedSchema() {
  const config = dbConfig()
  await ensureDatabaseExists(config)

  const dataSource = new DataSource({
    type: "mysql",
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: SEED_ENTITIES,
    synchronize: true,
  })

  await dataSource.initialize()
  await dataSource.destroy()

  console.log("Schema synchronized")
}

seedSchema().catch((err) => {
  console.error("Schema seed failed:", err)
  process.exit(1)
})
