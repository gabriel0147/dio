import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const projectId =
  process.env.E2E_PROJECT_ID || '11111111-1111-1111-1111-111111111111'

test.describe('fluxos autenticados SGPA/SRT e produção', () => {
  test.skip(!email || !password, 'Credenciais E2E não configuradas')

  test('valida tabelas, BSW e legendas interativas sem erros de console', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    const browserErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text())
    })
    page.on('pageerror', (error) => browserErrors.push(error.message))

    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.locator('input[name="password"]').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Produção', exact: true }).first().click()
    await page.getByRole('button', { name: /Abrir módulo SRP:/ }).click()
    await expect(page).toHaveURL(
      new RegExp(`/project/${projectId}/dashboard$`),
    )
    await expect(
      page.getByRole('heading', {
        name: 'Gestão da Produção NBS Petróleo e Gás',
      }),
    ).toBeVisible({ timeout: 20_000 })
    await page.waitForLoadState('networkidle')
    browserErrors.length = 0
    await expect(
      page.getByRole('columnheader', { name: 'Poço', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Gráficos do Registro de Produção' }),
    ).toBeVisible()

    const productionLegend = page
      .getByRole('button', { name: 'Exibir somente Produção do poço' })
      .first()
    await expect(productionLegend).toHaveAttribute('aria-pressed', 'false')
    await productionLegend.click()
    await expect(productionLegend).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /Exibir todas/ }).first()).toBeVisible()
    await productionLegend.click()
    await expect(productionLegend).toHaveAttribute('aria-pressed', 'false')
    await page.screenshot({
      path: testInfo.outputPath('dashboard-producao.png'),
      fullPage: true,
    })

    await page.getByRole('link', { name: 'Produção', exact: true }).first().click()
    await page.getByRole('button', { name: /Abrir módulo SRT:/ }).click()
    await expect(page).toHaveURL(/\/srt$/)
    await page
      .getByRole('link', { name: 'Lançamento de Teste', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Lançamento de Teste' }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByTestId('srt-measurement-heights').locator('label'),
    ).toHaveText([
      'Mi — Medição inicial (mm)',
      'Mf — Medição final (mm)',
      'Me — Interface da emulsão (mm)',
    ])
    await page.screenshot({
      path: testInfo.outputPath('srt-ordem-medicoes.png'),
      fullPage: false,
    })
    await page
      .getByRole('link', { name: 'BSW Total — Medição', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'BSW Total — Medição' }),
    ).toBeVisible({ timeout: 20_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Limpar filtros' })).toBeVisible()
    await page.getByRole('button', { name: 'Calcular BSW Total' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/último resultado laboratorial válido/)).toBeVisible()
    await expect(dialog.getByText('Data e hora da medição')).toBeVisible()
    await expect(dialog.locator('input[readonly]')).toHaveCount(2)
    await page.screenshot({
      path: testInfo.outputPath('bsw-total-dialog.png'),
      fullPage: true,
    })
    await page.keyboard.press('Escape')

    await page
      .getByRole('link', {
        name: 'BSW da Emulsão — Laboratório',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('heading', { name: 'BSW da Emulsão — Laboratório' }),
    ).toBeVisible({ timeout: 20_000 })
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Produção', exact: true }).first().click()
    await page.getByRole('button', { name: /Abrir módulo SGPA:/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Diário de Paradas (SGPA)' }),
    ).toBeVisible({ timeout: 20_000 })
    await page.waitForLoadState('networkidle')
    const categoryLegends = page.locator('button[aria-label^="Exibir somente"]')
    if ((await categoryLegends.count()) > 0) {
      const category = categoryLegends.first()
      await category.click()
      await expect(category).toHaveAttribute('aria-pressed', 'true')
      await category.click()
      await expect(category).toHaveAttribute('aria-pressed', 'false')
    }

    await page.waitForLoadState('networkidle')

    expect(browserErrors, browserErrors.join('\n')).toEqual([])
  })
})
