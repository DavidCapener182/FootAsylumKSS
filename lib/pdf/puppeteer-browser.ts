import fs from 'fs'
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer'

const LOCAL_CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

const LOCAL_PUPPETEER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox']

function mergeLaunchArgs(baseArgs: string[], overrideArgs: string[] = []): string[] {
  return Array.from(new Set([...baseArgs, ...overrideArgs]))
}

function fileExists(path?: string | null): path is string {
  if (!path) return false

  try {
    return fs.existsSync(path)
  } catch {
    return false
  }
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL
    || process.env.AWS_EXECUTION_ENV
    || process.env.AWS_LAMBDA_FUNCTION_NAME
    || process.env.LAMBDA_TASK_ROOT
  )
}

function resolveConfiguredExecutablePath(): string | undefined {
  const configuredCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ]

  return configuredCandidates.find(fileExists)
}

function resolveBundledPuppeteerExecutablePath(): string | undefined {
  try {
    const executablePath = puppeteer.executablePath()
    return fileExists(executablePath) ? executablePath : undefined
  } catch {
    return undefined
  }
}

function resolveLocalExecutablePath(): string | undefined {
  return LOCAL_CHROME_CANDIDATES.find(fileExists) ?? resolveBundledPuppeteerExecutablePath()
}

export async function launchPuppeteerBrowser(
  overrides: LaunchOptions = {}
): Promise<Browser> {
  const {
    args: overrideArgs = [],
    ...overrideOptions
  } = overrides
  const configuredExecutablePath = resolveConfiguredExecutablePath()

  if (configuredExecutablePath) {
    return await puppeteer.launch({
      headless: true,
      args: mergeLaunchArgs(LOCAL_PUPPETEER_ARGS, [...overrideArgs]),
      executablePath: configuredExecutablePath,
      ...overrideOptions,
    })
  }

  if (isServerlessRuntime()) {
    const chromium = (await import('@sparticuz/chromium')).default
    const headlessMode: LaunchOptions['headless'] = 'shell'

    return await puppeteer.launch({
      headless: headlessMode,
      args: puppeteer.defaultArgs({
        args: mergeLaunchArgs(chromium.args, [...overrideArgs]),
        headless: headlessMode,
      }),
      executablePath: await chromium.executablePath(),
      ...overrideOptions,
    })
  }

  const localExecutablePath = resolveLocalExecutablePath()

  return await puppeteer.launch({
    headless: true,
    args: mergeLaunchArgs(LOCAL_PUPPETEER_ARGS, [...overrideArgs]),
    ...(localExecutablePath ? { executablePath: localExecutablePath } : {}),
    ...overrideOptions,
  })
}
