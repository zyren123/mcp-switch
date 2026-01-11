import { _electron as electron, test, expect } from '@playwright/test'
import path from 'path'

test.describe('Application Launch', () => {
  test('should launch the application', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
    })

    const window = await electronApp.firstWindow()
    const title = await window.title()
    
    // Check if title is correct (assuming "MCP Switch" from spec or "Electron" default)
    // In src/main/index.ts usually title is set. 
    // Let's just log it and verify it's not empty for now or matches expected.
    console.log(`App title: ${title}`)
    expect(title).toBe('MCP Switch')

    await electronApp.close()
  })
})
