import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.click('text=Sign In')
    
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h1')).toContainText('Sign In')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('shows registration page', async ({ page }) => {
    await page.click('text=Get Started')
    
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Create Account')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('validates required fields on login', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit without filling fields
    await page.click('button[type="submit"]')
    
    // Should show browser validation
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('required')
  })

  test('displays validation error for invalid email format', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Browser should prevent submission with invalid email
    const emailInput = page.locator('input[type="email"]')
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test('navigates between login and register pages', async ({ page }) => {
    await page.goto('/login')
    
    // Go to register page
    await page.click('text=Create account')
    await expect(page).toHaveURL('/register')
    
    // Go back to login page
    await page.click('text=Sign in')
    await expect(page).toHaveURL('/login')
  })

  test('shows password toggle functionality', async ({ page }) => {
    await page.goto('/login')
    
    const passwordInput = page.locator('input[type="password"]')
    const toggleButton = page.locator('button[aria-label*="toggle"], button[title*="toggle"]').first()
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click toggle to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    
    // Click toggle again to hide password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('maintains form state during interaction', async ({ page }) => {
    await page.goto('/login')
    
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    
    await emailInput.fill('test@example.com')
    await passwordInput.fill('password123')
    
    // Click somewhere else (like toggle button) and verify values remain
    const toggleButton = page.locator('button[aria-label*="toggle"], button[title*="toggle"]').first()
    await toggleButton.click()
    
    await expect(emailInput).toHaveValue('test@example.com')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('handles form submission loading state', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    const submitButton = page.locator('button[type="submit"]')
    
    // Start submission
    await submitButton.click()
    
    // Button should show loading state (disabled or different text)
    await expect(submitButton).toBeDisabled()
  })

  test('shows proper focus management for accessibility', async ({ page }) => {
    await page.goto('/login')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    await expect(page.locator('input[type="email"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('input[type="password"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    // Should focus on toggle button or submit button
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('supports keyboard navigation and submission', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    // Submit using Enter key
    await page.keyboard.press('Enter')
    
    // Should trigger form submission
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })
}) 