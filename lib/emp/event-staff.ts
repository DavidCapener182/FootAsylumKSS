import {
  BBC_RADIO_ONE_2026_SIGN_IN_DATES,
  findEmpStaffByName,
  getBbcRadioOneStaffForEvent,
  normalizeEmpStaffName,
  type EmpStaffSignInRow,
} from '@/lib/emp/bbc-radio-one-staff'
import {
  DOWNLOAD_FESTIVAL_2026_SIGN_IN_DATES,
  getDownloadFestivalStaffForEvent,
} from '@/lib/emp/download-festival-staff'
import {
  PARKLIFE_2026_SIGN_IN_DATES,
  getParklifeStaffForEvent,
} from '@/lib/emp/parklife-staff'

export type { EmpStaffSignInRow }
export { findEmpStaffByName, normalizeEmpStaffName }

export function getEmpStaffForEvent(eventName: string, planTitle = '') {
  const parklifeStaff = getParklifeStaffForEvent(eventName, planTitle)
  if (parklifeStaff.length) return parklifeStaff

  const downloadStaff = getDownloadFestivalStaffForEvent(eventName, planTitle)
  if (downloadStaff.length) return downloadStaff

  return getBbcRadioOneStaffForEvent(eventName, planTitle)
}

export function getEmpStaffSignInDatesForEvent(eventName: string, planTitle = '') {
  if (getParklifeStaffForEvent(eventName, planTitle).length) {
    return PARKLIFE_2026_SIGN_IN_DATES
  }

  if (getDownloadFestivalStaffForEvent(eventName, planTitle).length) {
    return DOWNLOAD_FESTIVAL_2026_SIGN_IN_DATES
  }

  if (getBbcRadioOneStaffForEvent(eventName, planTitle).length) {
    return BBC_RADIO_ONE_2026_SIGN_IN_DATES
  }

  return []
}
