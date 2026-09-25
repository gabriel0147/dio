export interface LabBswCandidate {
  testId: string
  tankId: string
  wellId: string
  testEndAt: string
  bswEmulsionPct: number | null
  status: string
}

export function selectApplicableLabBsw(
  candidates: LabBswCandidate[],
  tankId: string,
  wellId: string,
  referenceAt: string | Date,
): LabBswCandidate | null {
  const referenceMs = new Date(referenceAt).getTime()
  if (!Number.isFinite(referenceMs)) return null

  return (
    candidates
      .filter((candidate) => {
        const testEndMs = new Date(candidate.testEndAt).getTime()
        return (
          candidate.tankId === tankId &&
          candidate.wellId === wellId &&
          (candidate.status === 'valido' || candidate.status === 'vigente') &&
          candidate.bswEmulsionPct !== null &&
          Number.isFinite(Number(candidate.bswEmulsionPct)) &&
          testEndMs <= referenceMs
        )
      })
      .sort(
        (left, right) =>
          new Date(right.testEndAt).getTime() -
          new Date(left.testEndAt).getTime(),
      )[0] || null
  )
}
