import { BadRequestException, NotFoundException } from "@nestjs/common"
import { TablesService } from "./tables.service"
import { ZoneStatus } from "../entities/zone.entity"
import { TableStatus } from "../entities/cafe-table.entity"

describe("TablesService", () => {
  let service: TablesService
  let zonesRepo: {
    findAll: jest.Mock
    findById: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  let tablesRepo: {
    findById: jest.Mock
    findActiveById: jest.Mock
    findByZone: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }

  beforeEach(() => {
    zonesRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    tablesRepo = {
      findById: jest.fn(),
      findActiveById: jest.fn(),
      findByZone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }

    service = new TablesService(zonesRepo as any, tablesRepo as any)
  })

  it("returns zones with tables using string ids for FE compatibility", async () => {
    zonesRepo.findAll.mockResolvedValue([
      {
        id: 1,
        name: "Tang 1",
        note: null,
        status: ZoneStatus.ACTIVE,
        tables: [
          {
            id: 101,
            name: "Ban 1",
            seats: 4,
            note: null,
            status: TableStatus.ACTIVE,
          },
        ],
      },
    ])

    const result = await service.findZones({ include: "tables" })

    expect(zonesRepo.findAll).toHaveBeenCalledWith(true)
    expect(result).toEqual([
      {
        id: "1",
        name: "Tang 1",
        note: "",
        status: "active",
        tables: [
          {
            id: "101",
            name: "Ban 1",
            seats: 4,
            note: "",
            status: "active",
          },
        ],
      },
    ])
  })

  it("creates a table in an active zone", async () => {
    zonesRepo.findById.mockResolvedValue({
      id: 1,
      status: ZoneStatus.ACTIVE,
    })
    tablesRepo.create.mockResolvedValue({
      id: 10,
      zoneId: 1,
      name: "Ban 10",
      seats: 4,
      note: "",
      status: TableStatus.ACTIVE,
    })

    const result = await service.createTable({
      zoneId: 1,
      name: "Ban 10",
      seats: 4,
      note: "",
    })

    expect(tablesRepo.create).toHaveBeenCalledWith({
      zoneId: 1,
      name: "Ban 10",
      seats: 4,
      note: "",
      status: TableStatus.ACTIVE,
    })
    expect(result).toMatchObject({
      id: "10",
      zoneId: "1",
      name: "Ban 10",
      seats: 4,
      status: "active",
    })
  })

  it("rejects creating a table in an inactive zone", async () => {
    zonesRepo.findById.mockResolvedValue({
      id: 1,
      status: ZoneStatus.INACTIVE,
    })

    await expect(
      service.createTable({
        zoneId: 1,
        name: "Ban 10",
        seats: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(tablesRepo.create).not.toHaveBeenCalled()
  })

  it("updates table status to inactive", async () => {
    tablesRepo.findById.mockResolvedValue({
      id: 10,
      zoneId: 1,
      name: "Ban 10",
      seats: 4,
      note: "",
      status: TableStatus.ACTIVE,
    })
    tablesRepo.update.mockResolvedValue({
      id: 10,
      zoneId: 1,
      name: "Ban 10",
      seats: 4,
      note: "",
      status: TableStatus.INACTIVE,
    })

    const result = await service.updateTableStatus(10, TableStatus.INACTIVE)

    expect(tablesRepo.update).toHaveBeenCalledWith(10, {
      status: TableStatus.INACTIVE,
    })
    expect(result.status).toBe("inactive")
  })

  it("finds only active table when validating order tableId", async () => {
    tablesRepo.findActiveById.mockResolvedValueOnce({
      id: 10,
      status: TableStatus.ACTIVE,
    })
    tablesRepo.findActiveById.mockResolvedValueOnce(null)

    await expect(service.findActiveTableById(10)).resolves.toEqual({
      id: 10,
      status: TableStatus.ACTIVE,
    })
    await expect(service.findActiveTableById(11)).resolves.toBeNull()
  })

  it("rejects updating a missing table", async () => {
    tablesRepo.findById.mockResolvedValue(null)

    await expect(
      service.updateTableStatus(99, TableStatus.INACTIVE),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(tablesRepo.update).not.toHaveBeenCalled()
  })
})
