import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('event-day kiosk security wiring', () => {
  it.each([
    ['verify', 'verify'],
    ['search-staff', 'search_staff'],
    ['clocked-in', 'clocked_in'],
    ['clock-in', 'clock_in'],
    ['clock-out', 'clock_out'],
  ])('wraps the %s route with request throttling and correlation logging', (route, action) => {
    const routeSource = source(`app/api/event-day/[token]/${route}/route.ts`)

    expect(routeSource).toContain('empEventDayKioskRoute')
    expect(routeSource).toContain(`action: '${action}'`)
    expect(routeSource).toContain('requestContext')
  })

  it('does not ship a fixed admin PIN to the browser', () => {
    const clientSource = source('components/emp/event-day/emp-event-day-kiosk-client.tsx')

    expect(clientSource).not.toContain('ADMIN_LOGIN_PIN')
    expect(clientSource).not.toContain("'1822'")
    expect(clientSource).toContain('ADMIN_LOGIN_HREF')
    expect(clientSource).toContain('kioskPinDraft')
  })

  it('keeps contact, SIA, clock, and note fields out of public roster lookup queries', () => {
    const dataSource = source('lib/emp/event-day-data.ts')
    const publicQueries = dataSource.slice(
      dataSource.indexOf('async function loadKioskEventDays'),
      dataSource.indexOf('async function loadKioskShiftByName')
    )

    expect(publicQueries).not.toMatch(/email|phone|sia_|clocked_in_at|clocked_out_at|staff_notes/)
    expect(publicQueries).toContain(".select('shift_start, shift_end, status, admin_notes, is_walk_up')")
    expect(publicQueries).toContain(".select('id, staff_name, agency, position, area, shift_start, shift_end, status, admin_notes, is_walk_up')")
  })

  it('verifies the selected worker before clock and equipment reads or writes', () => {
    const dataSource = source('lib/emp/event-day-data.ts')
    const clockedInSource = dataSource.slice(
      dataSource.indexOf('export async function getKioskClockedInStaff'),
      dataSource.indexOf('function equipmentRowsFromClockIn')
    )
    const clockInSource = dataSource.slice(
      dataSource.indexOf('export async function clockInEmpEventStaff'),
      dataSource.indexOf('export async function clockOutEmpEventStaff')
    )
    const clockOutSource = dataSource.slice(
      dataSource.indexOf('export async function clockOutEmpEventStaff')
    )

    expect(clockedInSource.indexOf('await assertWorkerVerification')).toBeGreaterThan(-1)
    expect(clockedInSource.indexOf('await assertWorkerVerification')).toBeLessThan(
      clockedInSource.indexOf(".from('emp_event_equipment_assignments')")
    )
    expect(clockInSource.indexOf('await assertWorkerVerification')).toBeGreaterThan(-1)
    expect(clockInSource.indexOf('await assertWorkerVerification')).toBeLessThan(
      clockInSource.indexOf(".from('emp_event_staff_shifts')\n    .update")
    )
    expect(clockOutSource.indexOf('await assertWorkerVerification')).toBeGreaterThan(-1)
    expect(clockOutSource.indexOf('await assertWorkerVerification')).toBeLessThan(
      clockOutSource.indexOf(".from('emp_event_equipment_assignments')")
    )
  })

  it('atomically reserves each PIN and worker proof before comparing it', () => {
    const dataSource = source('lib/emp/event-day-data.ts')
    const requestSource = source('lib/emp/event-day-kiosk-request.ts')
    const pinProofStart = dataSource.indexOf('if (settingsRow.kiosk_pin_hash)')
    const pinProofSource = dataSource.slice(
      pinProofStart,
      dataSource.indexOf('const plan = await getPlanOrThrow', pinProofStart)
    )
    const workerProofSource = dataSource.slice(
      dataSource.indexOf('async function assertWorkerVerification'),
      dataSource.indexOf('async function insertEquipmentEvents')
    )

    expect(pinProofSource.indexOf('reserveEmpEventDayKioskPinAttempt')).toBeLessThan(
      pinProofSource.indexOf('secretHashesMatch')
    )
    expect(workerProofSource.indexOf('reserveEmpEventDayWorkerVerificationAttempt')).toBeLessThan(
      workerProofSource.indexOf('evaluateEmpEventDayWorkerVerification')
    )
    expect(requestSource).not.toContain('increment: 0')
    expect(requestSource).not.toContain('recordEmpEventDayKioskPinFailure')
    expect(requestSource).not.toContain('recordEmpEventDayWorkerVerificationFailure')
    expect(requestSource).toContain(".eq('window_started_at', input.reservation.windowStartedAt)")
    expect(requestSource).toContain(".eq('request_count', input.reservation.currentCount)")
  })
})
