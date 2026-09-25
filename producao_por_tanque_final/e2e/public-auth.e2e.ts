import { expect, test } from '@playwright/test'

test('carrega a aplicacao e redireciona a sessao anonima para o login', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page).toHaveTitle('Gestão da Produção NBS Petróleo e Gás')
  await expect(
    page.getByText('Gestao da Producao NBS Petroleo e Gas'),
  ).toBeVisible()
})

for (const protectedPath of [
  '/teams',
  '/settings',
  '/user-management',
  '/audit-logs',
  '/project/00000000-0000-0000-0000-000000000000/hub',
]) {
  test(`protege ${protectedPath} sem sessao`, async ({ page }) => {
    await page.goto(protectedPath)

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
}

test('login invalido mostra feedback e bloqueia envio duplicado', async ({
  page,
}) => {
  let requestCount = 0
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    requestCount += 1
    await new Promise((resolve) => setTimeout(resolve, 150))
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('qa.invalid@example.test')
  await page.locator('input[name="password"]').fill('invalid-password-2026')
  await page.getByRole('button', { name: 'Entrar' }).dblclick()

  await expect(page.getByText('Email ou senha incorretos.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  expect(requestCount).toBe(1)
})

test('cadastro rejeita nome composto somente por espacos', async ({ page }) => {
  let signUpRequests = 0
  await page.route('**/auth/v1/signup**', async (route) => {
    signUpRequests += 1
    await route.abort()
  })

  await page.goto('/login')
  await page.getByRole('tab', { name: 'Solicitar conta' }).click()
  await page.getByLabel('Nome completo').fill('   ')
  await page.getByLabel('Email').fill('qa.whitespace@example.test')
  await page.locator('input[name="password"]').fill('12345')
  await page.getByRole('button', { name: 'Solicitar acesso' }).click()

  await expect(page.getByText('Informe seu nome completo')).toBeVisible()
  await expect(
    page.getByText('A senha deve ter no minimo 6 caracteres'),
  ).toBeVisible()
  expect(signUpRequests).toBe(0)
})

test('controles de senha tem nomes acessiveis e funcionam', async ({ page }) => {
  await page.goto('/login')

  const password = page.locator('input[name="password"]')
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Ocultar senha' })).toBeVisible()
})

test('login nao cria overflow horizontal no celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')

  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(sizes.scrollWidth).toBe(sizes.clientWidth)
})
