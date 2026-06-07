import * as fs from "fs"
import * as path from "path"

describe("seed:all script", () => {
  it("creates schema before importing all required seed data", () => {
    const packageJsonPath = path.join(__dirname, "../../package.json")
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

    expect(packageJson.scripts["seed:schema"]).toContain("seed-schema.ts")
    expect(packageJson.scripts["seed:demo-data"]).toContain("seed-demo-data.ts")
    expect(packageJson.scripts["seed:all"]).toBe(
      "npm run seed:schema && npm run seed:admin && npm run seed:permissions && npm run seed:tables && npm run seed:demo-data",
    )
  })

  it("keeps sample seed target at 100 rows", () => {
    const demoSeedPath = path.join(__dirname, "seed-demo-data.ts")
    const tableSeedPath = path.join(__dirname, "seed-tables.ts")
    const permissionSeedPath = path.join(__dirname, "seed-permissions.ts")

    const demoSeed = fs.readFileSync(demoSeedPath, "utf8")
    const tableSeed = fs.readFileSync(tableSeedPath, "utf8")
    const permissionSeed = fs.readFileSync(permissionSeedPath, "utf8")

    expect(demoSeed).toContain("const SEED_TARGET_ROWS = 100")
    expect(tableSeed).toContain("const SEED_TARGET_ROWS = 100")
    expect(permissionSeed).toContain("const DEMO_PERMISSION_TARGET = 100")
  })
})
