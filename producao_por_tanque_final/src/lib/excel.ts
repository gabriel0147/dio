/* Deprecated: Excel parsing is now handled by the import-calibration edge function */
export const parseCalibrationExcel = async (_file: File): Promise<any[]> => {
  throw new Error('Use sheetService.importCalibrationData instead.')
}
