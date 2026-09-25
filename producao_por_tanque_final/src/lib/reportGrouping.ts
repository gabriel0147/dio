import type { TankOperation } from './types'

export function groupOperationsByWell(
  operations: TankOperation[],
): Map<string, TankOperation[]> {
  const groups = new Map<string, TankOperation[]>()

  for (const operation of operations) {
    if (!operation.wellId) continue
    const group = groups.get(operation.wellId) || []
    group.push(operation)
    groups.set(operation.wellId, group)
  }

  return groups
}
