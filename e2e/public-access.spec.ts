import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('public access boundaries', () => {
  test('sign-in surface is usable and does not offer public registration', async ({ page }) => {
    await page.goto('/login?redirectTo=%2Freports')

    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
    await expect(page.getByRole('link', { name: 'Forgot your password?' })).toBeVisible()
    await expect(page.getByRole('link', { name: /create|sign up|register/i })).toHaveCount(0)

    await page.getByLabel('Email').fill('authorised.user@example.com')
    await page.locator('#password').fill('not-submitted')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(page.locator('#password')).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible()
  })

  test('legacy signup route explains the invitation-only boundary', async ({ page }) => {
    await page.goto('/login/signup')

    await expect(page.getByRole('heading', { name: 'Access is by invitation' })).toBeVisible()
    await expect(page.getByText(/Accounts are created by an authorised administrator/i)).toBeVisible()
    await expect(page.locator('input')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  test('unauthenticated protected routes preserve a safe redirect target', async ({ page }) => {
    await page.goto('/reports?format=csv')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    const currentUrl = new URL(page.url())
    expect(currentUrl.searchParams.get('redirectTo')).toBe('/reports?format=csv')
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
  })

  test('account setup cannot be opened without an authenticated session', async ({ page }) => {
    await page.goto('/login/account-setup')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
  })

  test('invalid public kiosk token fails closed without production credentials', async ({ page }) => {
    await page.route('**/api/event-day/invalid-token/verify', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Kiosk access is not available' }),
      })
    })

    await page.goto('/event-day/invalid-token')

    await expect(page.getByRole('heading', { name: 'Staff Sign In / Out' })).toBeVisible()
    await expect(page.getByText('Tablet access is not available.')).toBeVisible()
    await expect(page.getByText('Kiosk access is not available')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Admin login' })).toBeVisible()
  })
})

test.describe('public accessibility', () => {
  for (const surface of [
    { route: '/login', heading: 'Sign in to your account' },
    { route: '/login/signup', heading: 'Access is by invitation' },
  ]) {
    test(`${surface.route} has no serious or critical automated violations`, async ({ page }) => {
      await page.goto(surface.route)
      await expect(page.getByRole('heading', { name: surface.heading })).toBeVisible()

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const blockingViolations = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious'
      )

      expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([])
    })
  }
})
