import {
  INITIAL_PROJECTS,
  INITIAL_CALIBRATION_DATA,
  INITIAL_PRODUCTION_ROW,
} from '@/lib/initialData'
import { projectService } from '@/services/projectService'
import { sheetService } from '@/services/sheetService'
import { ProductionRow } from '@/lib/types'

export const seedDatabase = async (userId: string) => {
  console.log('Starting seed...')

  for (const project of INITIAL_PROJECTS) {
    console.log(`Creating project: ${project.name}`)
    const dbProject = await projectService.createProject(
      project.name,
      project.description,
      userId,
      'production',
    )

    for (const tank of project.tanks) {
      console.log(`Processing tank: ${tank.tag}`)

      // Ensure Production Field exists
      let pfId = tank.productionFieldId
      if (!pfId || pfId === 'field-1') {
        const pfs = await projectService.getProductionFields()
        const existingPf = pfs.find((p) => p.name === tank.productionField)
        if (existingPf) {
          pfId = existingPf.id
        } else {
          const newPf = await projectService.createProductionField(
            tank.productionField,
            userId,
          )
          pfId = newPf.id
        }
      }

      // Create Tank
      const dbTank = await projectService.createTank(dbProject.id, {
        tag: tank.tag,
        productionField: tank.productionField,
        productionFieldId: pfId,
        geolocation: tank.geolocation,
        wellId: tank.wellId,
        wellName: tank.wellName,
      })

      console.log(`Created tank: ${dbTank.tag} (${dbTank.id})`)

      // Seed Calibration
      if (INITIAL_CALIBRATION_DATA.length > 0) {
        console.log(`Seeding calibration for tank ${dbTank.tag}`)
        await sheetService.saveCalibrationData(
          dbTank.id,
          INITIAL_CALIBRATION_DATA,
          'Initial Seed',
          userId,
        )
      }

      // Seed Production (One empty row)
      const row: ProductionRow = {
        ...INITIAL_PRODUCTION_ROW,
        id: `seed-${Date.now()}`,
        D_Data_fim_periodo: new Date().toISOString(),
      }
      await sheetService.saveProductionData(dbTank.id, [row])
    }
  }

  console.log('Seed completed.')
}
