import type { EmpMasterTemplatePrefillData } from '@/lib/emp/master-template-prefill'

export const EMP_IRELAND_SIGN_IN_PRESET_ID = 'ireland-sign-in'
export const EMP_IRELAND_SIGN_IN_TEMPLATE_ID = 'staff-sign-in-sign-out-sheet'
export const EMP_IRELAND_JOBS_TITLE = 'Ireland Jobs - Sign-in / Sign-out Sheets'
export const EMP_IRELAND_JOBS_DESCRIPTION =
  'Blank sign-in / sign-out sheets for Ireland jobs, ready to print in volume.'
export const EMP_IRELAND_JOB_LOCATIONS = ['Marlay Park', 'Malahide Castle'] as const
export const EMP_IRELAND_PSA_BADGE_COLUMN_LABEL = 'PSA Badge Number'
export const EMP_IRELAND_VEST_NUMBER_COLUMN_LABEL = 'Vest Number'
export const EMP_COLUMN_LABEL_FIELD_PREFIX = 'Column Label:'
export const EMP_COLUMN_HIDDEN_FIELD_PREFIX = 'Column Hidden:'
export const EMP_DOCUMENT_DESCRIPTION_FIELD = 'Document Description'
export const EMP_TABLE_EMPTY_ROWS_FIELD = 'Table Empty Rows'

export function isIrelandSignInPreset(value: unknown) {
  return String(value || '').trim().toLowerCase() === EMP_IRELAND_SIGN_IN_PRESET_ID
}

export function buildIrelandSignInPrefillData(): EmpMasterTemplatePrefillData {
  return {
    eventName: '',
    eventDate: '',
    templateFieldValues: {
      [EMP_IRELAND_SIGN_IN_TEMPLATE_ID]: {},
    },
    templateTableCellValues: {},
    templateTablePageValues: {
      [EMP_IRELAND_SIGN_IN_TEMPLATE_ID]: EMP_IRELAND_JOB_LOCATIONS.map((location) => ({
        fields: {
          [EMP_DOCUMENT_DESCRIPTION_FIELD]:
            'Attendance control sheet for deployed staff, agencies, PSA badge tracking, and final sign-off.',
          [`${EMP_COLUMN_LABEL_FIELD_PREFIX} sia_badge_number`]: EMP_IRELAND_PSA_BADGE_COLUMN_LABEL,
          [`${EMP_COLUMN_LABEL_FIELD_PREFIX} shift_start`]: EMP_IRELAND_VEST_NUMBER_COLUMN_LABEL,
          [`${EMP_COLUMN_HIDDEN_FIELD_PREFIX} shift_end`]: 'true',
          [EMP_TABLE_EMPTY_ROWS_FIELD]: '16',
          'Location / Venue': location,
        },
        tableCells: {},
      })),
    },
  }
}
