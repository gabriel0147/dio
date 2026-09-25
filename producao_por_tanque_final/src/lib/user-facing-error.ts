type ErrorLike = {
  code?: string
  message?: string
  details?: string
}

export function getUserFacingError(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
) {
  const candidate = (error || {}) as ErrorLike
  const message = candidate.message || ''

  if (
    candidate.code === '23505' ||
    message.toLowerCase().includes('duplicate key value')
  ) {
    return 'Já existe um cadastro com esses dados.'
  }

  if (candidate.code === '23503') {
    return 'Este cadastro está sendo utilizado e não pode ser excluído.'
  }

  if (candidate.code === '42501') {
    return 'Você não tem permissão para realizar esta operação.'
  }

  return message && !message.toLowerCase().includes('constraint')
    ? message
    : fallback
}
