import type { EmpAnnexKey } from '@/lib/emp/master-template'
import {
  EMP_DOWNLOAD_PLAN_VALUES,
  EMP_DOWNLOAD_SELECTED_ANNEXES,
} from '@/lib/emp/download-plan'

const lines = (...items: string[]) => items.join('\n')

export const EMP_ISLE_OF_WIGHT_EVENT_NAME = 'Isle of Wight Festival 2026'
export const EMP_ISLE_OF_WIGHT_PLAN_TITLE =
  'KSS NW LTD Event Management Plan - Isle of Wight Festival 2026'

export const EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES: EmpAnnexKey[] =
  EMP_DOWNLOAD_SELECTED_ANNEXES.filter((annexKey) => annexKey !== 'search_screening')

const DOWNLOAD_TO_ISLE_OF_WIGHT_REPLACEMENTS: Array<[string, string]> = [
  ['Download Festival 2026', EMP_ISLE_OF_WIGHT_EVENT_NAME],
  ['Download Festival', 'Isle of Wight Festival'],
  ['Download 2026', 'Isle of Wight 2026'],
  ['DLF26', 'IOW26'],
  ['Download', 'Isle of Wight'],
  ['Donington Park / Event Control Centre at Pit Lane Suites - Garage 39', 'Seaclose Park / Event Control'],
  ['Pit Lane Suites - Garage 39', 'Event Control'],
  ['MOTO Donington Park', 'off-site RVP to be confirmed by Event Control'],
  ['Donington Park', 'Seaclose Park'],
  ['Castle Donington, Derby, DE74 2RP', 'Newport, Isle of Wight'],
  ['Leicestershire Police', 'Hampshire & Isle of Wight Constabulary'],
  ['Live Nation (Music) UK Ltd / Far and Beyond Events Ltd', 'Isle of Wight Festival Limited / Live Nation (Music) UK Ltd'],
  ['Live Nation (Music) UK Ltd', 'Isle of Wight Festival Limited / Live Nation (Music) UK Ltd'],
  ['Far and Beyond Events Ltd', 'Festival Republic'],
  ['Showsec International Ltd', 'appointed IWF security contractors'],
  ['Events Wellbeing', 'Events Wellbeing'],
  ['Leigh Harvey, Sandie Dunn and Lauren Stewart', 'Leigh Harvey and Lauren Stewart'],
  ['Sheena Jones - 07789 225511', 'Festival Gold / Silver via Event Control'],
  ['Accessible Campsite A4', 'accessible campsite'],
  ['Accessible Campsite D', 'secondary accessible campsite'],
  ['Accessibility Black Campsite', 'accessible campsite'],
  ['Accessibility campsite areas at grids W16 to S16 and R09', 'accessibility areas identified in the IWF site plans'],
  ['grids W16 to S16 and R09', 'locations identified in the IWF site plans'],
  ['W16 to S16 and R09', 'locations identified in the IWF site plans'],
  ['District X/Campsite Village', 'campsites and entertainment fields'],
  ['VIP/RIP', 'VIP'],
  ['Paddock', 'production/back-of-house interface'],
  ['Co-Op', 'sponsor'],
]

function toIsleOfWightText(value: string) {
  return DOWNLOAD_TO_ISLE_OF_WIGHT_REPLACEMENTS.reduce(
    (text, [from, to]) => text.split(from).join(to),
    value
  )
}

const clonedDownloadValues = Object.fromEntries(
  Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([key, value]) => [key, toIsleOfWightText(value)])
) as Record<string, string>

export const EMP_ISLE_OF_WIGHT_DEPLOYMENT_ROWS = [
  'Saturday 13 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Sunday 14 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Monday 15 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Monday 15 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Tuesday 16 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Tuesday 16 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Tuesday 16 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Tuesday 16 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|20:00|08:00|12.00',
  'Wednesday 17 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Wednesday 17 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Wednesday 17 June|OTHER DEPLOYMENTS|COOP - BOH - COOP COMPOUND||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Wednesday 17 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Wednesday 17 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Wednesday 17 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|14:00|00:00|10.00||||',
  'Wednesday 17 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||2|00:00|12:00|12.00',
  'Wednesday 17 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Wednesday 17 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|20:00|14:00|18.00',
  'Thursday 18 June|BAR DEPLOYMENTS|EVENT CONTROL|||SIA|1|17:00|01:00|8.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||MANAGER|1|13:00|02:00|13.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR|2|08:00|20:00|12.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|BAR DEPLOYMENTS|CIRQUE DE LA QUIRK||HDT|SIA|1|16:30|23:30|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS||HDT|SIA|1|16:30|23:30|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS - FOH||HDT|SIA|5|17:30|23:30|6.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|17:30|00:30|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|15:30|23:00|7.50||||',
  'Thursday 18 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|23:00|08:00|9.00',
  'Thursday 18 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|1|16:30|23:30|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|HIP SHAKER||AEGAUS|SIA|1|16:30|23:30|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|WILD HORSES PUB||HDT|SIA|1|16:00|23:00|7.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|WILD HORSES PUB||EAGLE|SIA - NIGHT|||||1|23:00|08:00|9.00',
  'Thursday 18 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|2|11:30|00:30|13.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|00:00|08:00|8.00',
  'Thursday 18 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|||||1|18:00|00:30|6.50',
  'Thursday 18 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|23:00|08:00|9.00',
  'Thursday 18 June|BAR DEPLOYMENTS|ELECTROLOVE A|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|ELECTROLOVE B|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|BAR DEPLOYMENTS|ELECTRIC LADY LAND BAR|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - SUPERVISOR||AEGAUS|SIA|1|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LIGHT - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MEADOW&LUNAR PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGES - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGIES - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LUNAR GROVE - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - SUPERVISOR||DSN SECURITY|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LIGHT - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MEADOW&LUNAR PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGES - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGIES - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LUNAR GROVE - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - BOH - COOP COMPOUND||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|10:00|02:00|16.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|14:00|02:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|00:00|12.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|22:00|10.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||1|12:00|22:00|10.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||2|00:00|12:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|17:30|20:00|2.50||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|00:00|13:00|13.00',
  'Thursday 18 June|OTHER DEPLOYMENTS|IQOS - COURTYARD|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|IQOS - BAR/BOH|||SIA|1|14:00|00:00|10.00||||',
  'Thursday 18 June|OTHER DEPLOYMENTS|IQOS - ENTRANCE / EXIT|||SIA|2|14:00|00:00|10.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|EVENT CONTROL|||SIA|1|09:00|01:00|16.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||MANAGER|1|13:00|02:00|13.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR|2|08:00|20:00|12.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT||HDT|SIA|2|13:30|00:00|10.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT - FOH||HDT|SIA|5|14:00|00:00|10.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT||HDT|SIA|2|13:30|00:00|10.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT - FOH||HDT|SIA|5|14:00|00:00|10.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|OCTOPUS GARDEN||HDT|SIA|2|13:30|00:00|10.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|RIVER STAGE BAR||HDT|SIA|1|13:30|23:30|10.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|VIP CRAZY DIAMOND||HDT|SIA|1|13:00|00:30|11.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|CIRQUE DE LA QUIRK||HDT|SIA|1|13:00|00:30|11.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS||HDT|SIA|1|15:00|01:30|10.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS - FOH||HDT|SIA|5|14:00|01:30|11.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|13:30|01:30|12.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|13:30|21:00|7.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|21:00|08:00|11.00',
  'Friday 19 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|1|12:30|01:30|13.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|HIP SHAKER||AEGAUS|SIA|1|14:00|01:30|11.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|WILD HORSES PUB||HDT|SIA|1|08:00|20:00|12.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|WILD HORSES PUB||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Friday 19 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|2|10:30|02:30|16.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|1|08:00|20:00|12.00||||',
  'Friday 19 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Friday 19 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|||||1|18:00|02:30|8.50',
  'Friday 19 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|01:00|08:00|7.00',
  'Friday 19 June|BAR DEPLOYMENTS|ELECTROLOVE A|||SIA|1|14:00|02:30|12.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|ELECTROLOVE B|||SIA|1|14:00|02:30|12.50||||',
  'Friday 19 June|BAR DEPLOYMENTS|ELECTRIC LADY LAND BAR|||SIA|1|14:00|01:30|11.50||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - SUPERVISOR||AEGAUS|SIA|1|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LIGHT - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MEADOW&LUNAR PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGES - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGIES - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LUNAR GROVE - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - SUPERVISOR||DSN SECURITY|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LIGHT - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MEADOW&LUNAR PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGES - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGIES - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LUNAR GROVE - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - BOH - COOP COMPOUND||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|02:00|19.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|09:00|02:00|17.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|00:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|22:00|10.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||1|12:00|22:00|10.00',
  'Friday 19 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||2|00:00|12:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|08:00|20:00|12.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|11:00|21:00|10.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Friday 19 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|00:00|11:00|11.00',
  'Friday 19 June|OTHER DEPLOYMENTS|IQOS - COURTYARD|||SIA|1|13:00|00:00|11.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|IQOS - BAR/BOH|||SIA|1|13:00|00:00|11.00||||',
  'Friday 19 June|OTHER DEPLOYMENTS|IQOS - ENTRANCE / EXIT|||SIA|2|13:00|00:00|11.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|EVENT CONTROL|||SIA|1|09:00|01:00|16.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||MANAGER|1|13:00|02:00|13.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR|2|08:00|20:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT||HDT|SIA|2|11:00|00:00|13.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT - FOH||HDT|SIA|5|12:00|00:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT||HDT|SIA|2|11:00|00:00|13.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT - FOH||HDT|SIA|5|12:00|00:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|OCTOPUS GARDEN||HDT|SIA|2|11:00|00:00|13.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|RIVER STAGE BAR||HDT|SIA|1|13:30|23:30|10.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|VIP CRAZY DIAMOND||HDT|SIA|1|13:30|23:30|10.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|CIRQUE DE LA QUIRK||HDT|SIA|1|13:00|00:30|11.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS||HDT|SIA|1|13:00|01:30|12.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS - FOH||HDT|SIA|5|14:00|01:30|11.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|10:30|01:30|15.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|12:30|21:00|8.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|21:00|08:00|11.00',
  'Saturday 20 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|1|13:00|01:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|HIP SHAKER||AEGAUS|SIA|1|13:00|01:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|WILD HORSES PUB||HDT|SIA|1|08:00|20:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|WILD HORSES PUB||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Saturday 20 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|2|09:30|02:30|17.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|1|08:00|20:00|12.00||||',
  'Saturday 20 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Saturday 20 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|||||1|18:00|02:30|8.50',
  'Saturday 20 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|01:00|08:00|7.00',
  'Saturday 20 June|BAR DEPLOYMENTS|ELECTROLOVE A|||SIA|1|14:00|02:30|12.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|ELECTROLOVE B|||SIA|1|14:00|02:30|12.50||||',
  'Saturday 20 June|BAR DEPLOYMENTS|ELECTRIC LADY LAND BAR|||SIA|1|14:00|01:30|11.50||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - SUPERVISOR||AEGAUS|SIA|1|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LIGHT - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MEADOW&LUNAR PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGES - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGIES - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LUNAR GROVE - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - SUPERVISOR||DSN SECURITY|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LIGHT - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MEADOW&LUNAR PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGES - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGIES - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LUNAR GROVE - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - BOH - COOP COMPOUND||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|02:00|19.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|09:00|02:00|17.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|00:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|09:00|22:00|13.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||1|09:00|22:00|13.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||2|00:00|12:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|08:00|20:00|12.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|11:00|21:00|10.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|22:00|11:00|13.00',
  'Saturday 20 June|OTHER DEPLOYMENTS|IQOS - COURTYARD|||SIA|1|11:00|22:00|11.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|IQOS - BAR/BOH|||SIA|1|11:00|22:00|11.00||||',
  'Saturday 20 June|OTHER DEPLOYMENTS|IQOS - ENTRANCE / EXIT|||SIA|2|11:00|22:00|11.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|EVENT CONTROL|||SIA|1|09:00|01:00|16.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||MANAGER|1|13:00|02:00|13.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR|2|08:00|20:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT||HDT|SIA|2|11:00|00:00|13.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT - FOH||HDT|SIA|5|12:00|00:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT||HDT|SIA|2|11:00|00:00|13.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 2 - STAGE LEFT - FOH||HDT|SIA|5|12:00|00:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|OCTOPUS GARDEN||HDT|SIA|2|11:00|00:00|13.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|RIVER STAGE BAR||HDT|SIA|1|13:30|23:30|10.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|VIP CRAZY DIAMOND||HDT|SIA|1|13:30|23:00|9.50||||',
  'Sunday 21 June|BAR DEPLOYMENTS|CIRQUE DE LA QUIRK||HDT|SIA|1|13:00|23:00|10.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS||HDT|SIA|1|13:00|01:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|BAR 10 - STRAWBERRY FIELDS - FOH||HDT|SIA|5|14:00|00:30|10.50||||',
  'Sunday 21 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|10:30|00:30|14.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|4|12:30|21:00|8.50||||',
  'Sunday 21 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|21:00|08:00|11.00',
  'Sunday 21 June|BAR DEPLOYMENTS|STEELERS WHEEL||HDT|SIA|1|13:00|01:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|HIP SHAKER||AEGAUS|SIA|1|13:00|01:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|WILD HORSES PUB||HDT|SIA|1|08:00|20:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|WILD HORSES PUB||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Sunday 21 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|2|09:30|01:30|16.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|1|08:00|20:00|12.00||||',
  'Sunday 21 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Sunday 21 June|BAR DEPLOYMENTS|LAST CHANCE SALOON|||SIA|||||1|18:00|01:30|7.50',
  'Sunday 21 June|BAR DEPLOYMENTS|LAST CHANCE SALOON||EAGLE|SIA - NIGHT|||||1|00:00|08:00|8.00',
  'Sunday 21 June|BAR DEPLOYMENTS|ELECTROLOVE A|||SIA|1|14:00|01:30|11.50||||',
  'Sunday 21 June|BAR DEPLOYMENTS|ELECTROLOVE B|||SIA|1|14:00|01:30|11.50||||',
  'Sunday 21 June|BAR DEPLOYMENTS|ELECTRIC LADY LAND BAR|||SIA|1|14:00|23:00|9.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - SUPERVISOR||AEGAUS|SIA|1|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LIGHT - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MEADOW&LUNAR PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGES - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGIES - PATROL||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LUNAR GROVE - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - SUPERVISOR||DSN SECURITY|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MOON - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LIGHT - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - MEADOW&LUNAR PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - TIPI PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGES - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LODGIES - PATROL||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES Nights - LUNAR GROVE - ENTRANCE||DSN SECURITY|SIA - NIGHT|||||2|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - BOH - COOP COMPOUND||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|19:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|02:00|19.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|09:00|02:00|17.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - COOP COMPOUND||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|12:00|00:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE|||SIA - DAY|2|09:00|22:00|13.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||1|09:00|22:00|13.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|SKY - SKY OPEN HOUSE||EAGLE|SIA - NIGHT|||||2|00:00|10:00|10.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|08:00|20:00|12.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH|||SIA|1|11:00|21:00|10.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|SHEIN - SHEIN FOH||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|IQOS - OVERNIGHT|||SUPERVISOR|||||1|22:00|09:00|11.00',
  'Sunday 21 June|OTHER DEPLOYMENTS|IQOS - COURTYARD|||SIA|1|11:00|22:00|11.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|IQOS - BAR/BOH|||SIA|1|11:00|22:00|11.00||||',
  'Sunday 21 June|OTHER DEPLOYMENTS|IQOS - ENTRANCE / EXIT|||SIA|2|11:00|22:00|11.00||||',
  'Monday 22 June|BAR DEPLOYMENTS|STEELERS WHEEL||EAGLE|SIA - NIGHT|||||1|20:00|08:00|12.00',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - SUPERVISOR||AEGAUS|SIA|1|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - PATROL||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LIGHT - ENTRANCE||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MEADOW&LUNAR PATROL||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI ENTRANCE||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - TIPI PATROL||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGES - ENTRANCE||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LODGIES - PATROL||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - LUNAR GROVE - ENTRANCE||AEGAUS|SIA|2|08:00|12:00|4.00||||',
  'Monday 22 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|13:00|6.00||||',
]

export const EMP_ISLE_OF_WIGHT_PLAN_VALUES: Record<string, string> = {
  ...clonedDownloadValues,
  plan_title: EMP_ISLE_OF_WIGHT_PLAN_TITLE,
  document_version: 'V1.2',
  document_status: 'V1',
  author_name: 'David Capener - KSS NW LTD',
  approver_name: 'Floyd Allen - KSS NW LTD',
  issue_date: '2026-05-29',
  review_date: '2026-06-18',
  distribution_list: lines(
    'KSS operational leadership and supervisors',
    'Isle of Wight Festival Event Control',
    'Isle of Wight Festival Limited / Live Nation (Music) UK Ltd event management team',
    'Festival safeguarding, welfare, medical, accessibility, bar and sponsor leads',
    'Security Coordinator, Crowd Safety Manager, Event Control Manager and contractor control teams'
  ),

  purpose_scope_summary:
    'This Event Management Plan sets out the KSS NW LTD operational arrangements for Isle of Wight Festival 2026 at Seaclose Park, Medina College playing fields and the adjoining North Fairlee Farm fields in Newport. KSS is identified in the IWF security plan as the security contractor for Bars, Sponsors and Pink Moon, and the supplied E06 Master - IOW26 Security Schedule V1 confirms KSS posts across bar deployments, Pink Moon campsite posts, COOP, Sky, Shein, IQOS and Event Control. This plan incorporates the supplied IWF ESOP, operational management, crowd management, security, risk, public-facing, DIMALICED, alcohol management and KSS deployment source documents. Named KSS area leads and final radio call signs remain subject to the live deployment sheet and radio plan.',
  related_documents: lines(
    '1.0 ESOP IWF Introduction and Index 2026 V2',
    '1.6 IWF Operational Management Structure 2026 V2',
    '1.7 IWF Site Plan 2026 V7',
    '1.8 IWF Public Facing Document 2026 V1',
    '2.0 IWF Risk Assessment 2026 V2',
    '4.0 IWF Crowd Management Plan 2026 V3',
    '4.0b IWF DIMALICE Normal & Emergency 2026 V1',
    '5.1 IWF Security Plan V3.1, including appendices',
    '11.0 IWF Alcohol Management Plan 2026 V2',
    'E06 Master - IOW26 Security Schedule V1'
  ),
  operational_assumptions_dependencies: lines(
    'KSS deployment numbers, post titles, shift times and quantities are aggregated from the staff-shift lines in E06 Master - IOW26 Security Schedule V1.',
    'KSS operates under Isle of Wight Festival Event Control direction and within the IWF Gold, Silver and Bronze command structure.',
    'KSS scope is based on the supplied security plan and deployment schedule, covering bar deployments, Pink Moon, COOP, Sky, Shein, IQOS and Event Control support.',
    'Search, eviction, safeguarding, crowd management, emergency evacuation, Show Stop, public messaging and police liaison are governed by IWF source plans, Festival Gold/Silver and Event Control.',
    'Site plans, queue layouts, bar footprints, sponsor areas, Pink Moon arrangements, search lanes, accessible routes, campsites and production areas may be revised before or during the event.',
    'Weather, ground condition, welfare demand, security intelligence, transport demand, ferry disruption or route loss may alter deployment, queue layouts, patrol focus or area priorities.',
    'If a named KSS lead, post time or staffing quantity changes operationally, Event Control will be notified and the live deployment sheet supersedes this document for the relevant role or shift.'
  ),

  event_name: EMP_ISLE_OF_WIGHT_EVENT_NAME,
  event_type:
    'Well-established four-day music festival, in its 23rd year of operation, with camping, arena entertainment, licensed bars, food and non-food traders, sponsor activations, accessible facilities, public ingress, public egress, campsite clearance and external transport interfaces.',
  venue_name: 'Seaclose Park',
  venue_address: 'Seaclose Park, Medina College playing fields and adjoining North Fairlee Farm fields, Newport, Isle of Wight',
  venue_reference: 'Seaclose Park / North Fairlee Farm / Medina College playing fields',
  organiser_name: 'Isle of Wight Festival Limited',
  client_name: 'Isle of Wight Festival Limited / Live Nation (Music) UK Ltd',
  principal_contractor: 'Festival Republic - Principal Contractor and Principal Designer role identified in the IWF risk assessment',
  key_delivery_partners: lines(
    'KSS NW LTD - security contractor for Bars, Sponsors and Pink Moon',
    'One Circle Events - bar operator and alcohol management delivery',
    'Specialized Security, Stambridge Security, Compact Security, TTC Security, Pathway, Inquest Canine & Detection Services and Anubis - wider security contractors',
    'Events Wellbeing - welfare and lost property provision',
    'EMS - medical provision, led by Medical Commander Matt Robbins',
    'EMFS - fire safety provision, led by Fire Safety Manager Dave Raddon',
    'Event People Team - traffic management delivery',
    'Oxfam and Festaff - stewarding contractors',
    'Hampshire & Isle of Wight Constabulary, Isle of Wight NHS Trust, Isle of Wight Fire & Rescue Service and Isle of Wight Council through Event Control/SAG liaison'
  ),
  build_dates: '24-day build period allowed for in the IWF risk assessment. KSS pre-show deployment in E06 Master - IOW26 Security Schedule V1 runs from Saturday 13 June to Wednesday 17 June 2026.',
  show_dates: '18 June 2026 to 21 June 2026',
  break_dates: '14-day break and load-out period allowed for in the IWF risk assessment. KSS post-show deployment in E06 Master - IOW26 Security Schedule V1 includes Monday 22 June 2026.',
  public_ingress_time:
    'Public ticketed arrival begins on Thursday 18 June 2026. Wristband Entrance A2 links to festival car parks, A3 links to the festival bus station, and A5 serves pedestrian arrivals from Fairlee Road/Newport. Exact daily gate, campsite and arena opening times remain subject to the final live schedule.',
  operational_hours: lines(
    'KSS deployment: operates to E06 Master - IOW26 Security Schedule V1 and Event Control instructions.',
    'Deployment date range: scheduled KSS deployment rows run from Saturday 13 June to Monday 22 June 2026.',
    'Show period: 18 June 2026 to 21 June 2026.',
    'Event Control source rota: runs from the evening before public opening through Monday close with day shifts 07:00-19:00, night shifts 19:00-07:00 and final close-out 07:00-14:00, subject to day/date reconciliation in the live control plan.',
    'One Circle bar schedules: vary by bar. Approximate bar operations include arena bars opening from 14:00 on Friday and 11:00 on Saturday/Sunday, with later bars operating into the early hours where licensed.',
    'CCTV operation: scheduled from 18:00 on Wednesday 17 June to 14:00 on Monday 22 June in the security plan.'
  ),

  licensed_capacity:
    'Licensed capacity is 89,999.',
  expected_attendance:
    'Total attendance is anticipated to be in the region of 60,000. The IWF risk assessment identifies ticket sales in the region of 55,000, up to 2,000 complimentary guest tickets, ticket-holder attendance capped at 57,000, and approximately 3,000 staff, volunteers and artists on site.',
  staff_and_contractor_count:
    'Approximately 3,000 staff, volunteers and artists are included in the anticipated attendance profile. E06 Master - IOW26 Security Schedule V1 contains 469 KSS staff-shifts, 5,285.5 scheduled hours and 285 aggregated EMP deployment rows, with scheduled KSS staff totals peaking at 112 across Friday 19, Saturday 20 and Sunday 21 June.',
  audience_age_profile:
    'All-age audience, predominantly 25+ with an average age around 40. The Crowd Management Plan describes an audience from around 5 to 70 years, approximately balanced by gender and including a significant family presence.',
  attendance_profile:
    'The event profile includes campers, day visitors, families, accessibility customers, guests, artists, staff, contractors, sponsor-area customers and bar customers. Source assessments describe a generally compliant audience with varying needs, but controls do not rely on audience profile alone.',
  travel_modes:
    'Arrival modes include ferry-linked travel, Southern Vectis buses, Big Green Coaches, car parks, private pick-up/drop-off, taxis, pedestrian arrivals from Newport/Fairlee Road, accessible arrival routes and staff/production access. Public transport providers consulted include Southern Vectis, Hovertravel, Red Funnel and Wightlink.',
  family_presence:
    'The event has a significant family presence and an all-age audience. KSS staff must treat children and young people as safeguarding-sensitive in any refusal, welfare, ejection or search escalation.',
  alcohol_profile:
    'Alcohol demand is significant across approximately 36 One Circle bars, including main arena bars, VIP bars, sponsor/partner bars and Pink Moon bars. Challenge 25, proxy-sale awareness, signs of intoxication, refusal logging, anti-harassment and spiking awareness are core controls.',
  camping_profile:
    'The event includes public campsites, Pink Moon, live-in vehicle areas and campsite clearance after the show period. KSS Pink Moon deployment covers supervisor, entrance and patrol positions using the master schedule labels for Moon, Light, Meadow/Lunar, Tipi, Lodges and Lunar Grove posts from Thursday 18 June through Monday 22 June.',
  historic_issues:
    'Historic IWF planning focuses on arrival and last-mile demand, Fairlee Road traffic management, campsite ingress, search demand, bar and toilet peaks, Main Stage/Big Top movement, egress and dispersal, welfare demand, safeguarding, crime prevention, prohibited items, intoxication, drugs, weather and transport interfaces.',
  mood_and_trigger_points:
    'Trigger points include delayed arrival, ferry or transport disruption, search delay, bar queue congestion, refusals of service, suspected proxy sales, intoxication, harassment or spiking disclosures, lost persons, accessibility obstruction, adverse weather, headline movements, toilet demand and Fairlee Road egress demand.',
  peak_periods: lines(
    'Thursday 18 June 2026 - public arrival, campsite ingress, ticket/wristband processing and early site opening.',
    'Friday 19 June to Sunday 21 June 2026 - arena opening, bar and sponsor peaks, headline periods and nightly egress.',
    'Friday and Saturday main arena egress is expected around 00:00hrs, with Sunday main arena egress around 23:00hrs.',
    'Late evening and overnight - campsite return, welfare demand, intoxication and safeguarding escalation.',
    'Monday 22 June 2026 - campsite clearance, lost property/person reports, staff fatigue and final demobilisation where applicable.'
  ),

  site_layout_summary:
    'Isle of Wight Festival 2026 occupies Seaclose Park, Medina College playing fields and adjoining North Fairlee Farm fields in Newport. The site includes campsites, Main Arena, Big Top, Strawberry Fields, Penny Lane, Electric Ladyland, River Stage, hospitality, sponsor areas, Pink Moon, licensed bars, food and non-food traders, welfare, medical, accessible facilities, production/back-of-house areas, car parks, bus station and Fairlee Road interfaces.',
  key_zones: lines(
    'KSS bars and licensed service areas',
    'KSS sponsor areas',
    'KSS Pink Moon area',
    'Main Arena, Big Top, Strawberry Fields, Penny Lane and Electric Ladyland crowd interfaces where KSS posts intersect',
    'Wristband Entrance A2 - car park linked entrance',
    'Wristband Entrance A3 - festival bus station entrance',
    'Wristband Entrance A5 - pedestrian arrivals from Fairlee Road and Newport',
    'VIP/guest entrance at A6 Production Gate and production/back-of-house interfaces where tasked',
    'Accessible/VIP/performer entry routes and accessible service points where tasked',
    'Welfare Tent, safeguarding, medical, Event Control, Eviction Team and lost property interfaces',
    'Emergency exits, Fairlee Road, Quayside/Gate A7, transport interfaces and HVM-controlled egress routes'
  ),
  controlled_areas:
    'Controlled areas include KSS bar footprints, bar back-of-house areas, stock routes, sponsor areas, Pink Moon, any assigned queue lanes, staff-only areas, restricted production interfaces, welfare/safeguarding handover spaces, medical interfaces, service routes and any route or cordon temporarily assigned by Event Control.',
  emergency_exits_holding_areas:
    'Emergency exits and holding areas are controlled by the wider IWF emergency and crowd plans. Main Arena emergency exits include Red Gate, Octopus Gate, White Gate 1, White Gate 2, Green Gate, Production Gate A6 and Gate A7, with total emergency exit width assessed as 87.5m and 75m after discounting the largest exit. Fairlee Road provides a significant holding channel and Event Control will direct the appropriate exit route. KSS will keep local queues clear of emergency routes and report route compromise immediately.',
  dim_aliced_design:
    'IWF DIMALICED controls include designed transport links and arrival points, waiting and holding areas, CCTV at each entry lane and holding areas, sufficient area for licensed capacity, split egress gates/routes, illuminated exits, separated pedestrian/vehicle routes where possible, 10-15 entry lanes, enhanced search away from gate flow, no-bag lanes, Accessibility/VIP/Performer entry, and Fairlee Road closure/HVM trigger planning for egress.',
  dim_aliced_information:
    'Advance entry information is issued to ticket holders. Signage, spoken instruction, social media, event app, big screens, PA systems, loud hailers and staff direction are used for wayfinding, queue preparation, ingress, circulation, egress and dispersal. Event Control may deploy drone live feed during peak demand to support situational awareness.',
  dim_aliced_management:
    'Management controls include senior IWF staff at key locations, Gate Managers, Event Control CCTV and partner liaison, Security Working Group oversight, Security/Crowd Safety Manager monitoring, daily egress meetings, route sweeps before egress, vehicle lockdown before egress and dynamic redeployment where crowd density, route congestion or transport disruption requires it.',
  dim_aliced_activity:
    'Arrival considerations affecting KSS include public arrival through A2, A3 and A5, campsite entry, bar and sponsor first-contact points, Pink Moon access, queue readiness, accessible arrival support, welfare recognition and early escalation to Event Control.',
  dim_aliced_location:
    'Last-mile factors include Seaclose Park, North Fairlee Farm/Medina College fields, Fairlee Road interfaces, car park and bus station routes, ferry-linked transport demand, taxis/private hire/drop-off, pedestrian approaches from Newport and accessible movement requirements.',
  dim_aliced_ingress:
    'Ingress includes soft ticket checks, screening, bag search, pat-down search, ticket check to wristband and enhanced drug-dog screening where applied. A2 and A3 campsite entrances operate Level 3A search arrangements; A5 day entry operates Level 3B. Dedicated no-bag, VIP/guest/accessibility lanes and query lanes are used to protect flow.',
  dim_aliced_circulation:
    'Once inside the event perimeter, the public can circulate freely. Circulation risks include movements between Main Stage, Big Top, Strawberry Fields, Penny Lane, Electric Ladyland, bars, concessions, toilets and campsites. Event Control, CCTV, spotters, area managers, security and stewards monitor movement and can redirect, hold, rebalance or support show-stop decisions.',
  dim_aliced_egress:
    'Egress planning assumes higher density departure than ingress. Main arena egress is expected around 00:00hrs on Friday/Saturday and 23:00hrs on Sunday. Destination and transport modes are signed to specific exits, PA/loud hailer support is available, Fairlee Road closure and HVM deployment are managed through trigger plans, and Green Gate can split routes to Fairlee Road if demand exceeds capacity.',
  dim_aliced_dynamics:
    'Dispersal risk is highest where alcohol, fatigue, family groups, accessibility needs, ferry/transport timing, weather, ground conditions, headline movements, toilet/bar demand, campsite return and local resident interfaces combine. KSS supervisors will escalate early rather than allow local queue or welfare issues to become crowd-management issues.',

  ramp_routes:
    'Primary routes include A2 car park entrance, A3 bus station entrance, A5 Fairlee Road pedestrian entrance, A6 production/VIP/guest route, Fairlee Road, Red Gate/Quay/Gate A7, campsite routes, bar queues, sponsor/Pink Moon routes, emergency exits and service routes.',
  ramp_arrival:
    'Static and dynamic gathering spaces include car parks, bus station waiting and boarding areas, ferry-linked transport interfaces, Fairlee Road dwell and holding areas, campsite entrances, bar queue areas, sponsor and Pink Moon areas, welfare/medical interfaces, emergency route approaches and Main Arena/Big Top gathering zones. Supervisors use signage, spoken instruction and live reporting to keep each area within its planned footprint.',
  ramp_movement:
    'Peak movement demand is expected during ingress, changes of act, busy food/bar periods, Main Stage/Big Top movements, arena close, campsite return and final dispersal. Routes are mapped in the IWF ingress, circulation and egress plans, with control by Event Control, area managers, security and stewards.',
  ramp_profile:
    'The audience profile is all-age, broadly family-inclusive, predominantly 25+ with an average age around 40, generally compliant but with varying needs. KSS controls must still address intoxication, refusal conflict, vulnerability, safeguarding, lost persons, accessibility needs, anti-social behaviour, drug-related welfare, crime and suspicious activity.',

  gross_area:
    'Full site area and venue-level capacities are controlled by the IWF site, crowd and risk plans. KSS operational area assessment will be based on the confirmed Bars, Sponsors and Pink Moon post footprints in the deployment schedule.',
  net_area:
    'Net usable KSS operating space excludes bar counters, BOH, stock storage, emergency routes, accessible routes, toilets, stage routes, service lanes, structures, plant, vehicle routes and any area controlled by another contractor unless Event Control tasks KSS support.',
  excluded_areas:
    'Excluded areas include areas not allocated to KSS in the deployment schedule, non-KSS campsites, non-KSS production/backstage areas, police/medical/welfare treatment areas, restricted compounds and areas under another contractor control unless Event Control directs support.',
  density_assumptions:
    'General entertainment and amenities are designed around maximum average density of 2 persons per square metre. Tented venues and defined structures are subject to dynamic capacity assessment and closure/one-in-one-out where required. KSS will intervene before local queues cause route encroachment, barrier loading, accessibility obstruction or conflict.',
  zone_capacities: lines(
    'Licensed capacity - 89,999.',
    'Planned ticket capacity - 60,000 tickets in the Crowd Management Plan.',
    'Ticket sales expected - around 55,000.',
    'Complimentary guest tickets - maximum 2,000.',
    'Ticket-holder attendance cap - 57,000.',
    'Staff, volunteers and artists - approximately 3,000.',
    'Total anticipated attendance - approximately 60,000.',
    'Main Arena emergency evacuation capacity basis - 56,999 including guests, crew and artists.',
    'Main Arena emergency exit width - 87.5m total, 75m after discounting largest exit; calculated evacuation time 9.49 minutes at 80 persons/metre/minute or 10.85 minutes at 70 persons/metre/minute.',
    'KSS allocated areas in E06 Master - IOW26 Security Schedule V1 - BAR DEPLOYMENTS and OTHER DEPLOYMENTS, including Pink Moon, COOP, Sky, Shein, IQOS and Event Control.',
    'KSS scheduled deployment total - 469 staff-shifts, peaking at 112 on Friday 19, Saturday 20 and Sunday 21 June.'
  ),
  ingress_flow_assumptions:
    'Ingress flow is controlled by the IWF gate/search plan. KSS will support only where assigned by the deployment schedule or Event Control, preserving bar/sponsor/Pink Moon queues and escalating gate congestion or route conflict observed from assigned posts.',
  egress_flow_assumptions:
    'Egress follows the IWF egress plan, Event Control direction, Fairlee Road closure/HVM trigger plan and destination-specific exit routing. KSS will clear local queues, stop service where instructed, preserve assigned routes and support factual public direction.',
  emergency_clearance_assumptions:
    'Emergency clearance from KSS areas depends on stopping local activity where instructed, protecting routes, opening or moving local barrier lines, supporting vulnerable/disabled persons and reporting route status to Event Control.',
  degraded_route_weather_assumptions:
    'Wet ground, darkness, fatigue, transport disruption, ferry demand, crowd frustration or route loss may reduce throughput. KSS will request route support, lighting, matting, barrier changes, holds or redeployment through Event Control where assigned areas become unsafe.',

  command_structure:
    'KSS command operates through the KSS operational lead, KSS area supervisors and Event Control. The IWF command structure uses Gold (Strategic), Silver (Tactical) and Bronze (Operational) to support interoperability with emergency response agencies. Festival Gold has ultimate critical safety decision responsibility; Festival Silver manages tactical command and control; Festival Bronze attends significant incidents and can be supported by specialist departmental Bronzes.',
  named_command_roles: lines(
    'KSS Operational Lead - Floyd Allen - overall KSS delivery, client liaison and escalation.',
    'KSS Deputy / Escalation Lead - Callum Keegan - operational support, documentation, supervisor support, issue tracking and deputy escalation route.',
    'KSS Bars / Sponsors / Pink Moon supervisors - post holders to be confirmed from the live deployment sheet.',
    'Festival Director / Festival Gold - Caroline Giddings.',
    'Festival Promoter - John Giddings.',
    'Event Manager - Steve Porter.',
    'Festival Silver (Days) - Matt Williams.',
    'Festival Silver (Nights) - Paul Budden.',
    'Operational Support / Festival Gold & Silver Support - Dave Steele.',
    'Event Control Manager (Days) - Hector MacPherson.',
    'Event Control Manager (Nights) - Andy Turner.',
    'Security Coordinator (Days) - Gerry Broadbent.',
    'Security Coordinator (Nights) - Dave Thomas.',
    'Deputy Security Coordinator - Carl Lee.',
    'Security & Crowd Safety Manager - Robbie Naish.',
    'Designated Premises Supervisor - Liam Whittaker (One Circle).',
    'Bars Operations Manager - Charlotte Bevan (One Circle).',
    'Safeguarding Coordinator (Days) - Leigh Harvey.',
    'Safeguarding Coordinator (Nights) - Lauren Stewart.',
    'Medical Commander - Matt Robbins (EMS).',
    'Fire Safety Manager - Dave Raddon (EMFS).',
    'Traffic Manager - Ella Hay (EP Team).',
    'Guestlist Manager & Accessibility Manager - Lindsay Winton.'
  ),
  radio_channels_callsigns: lines(
    'Assigned KSS operational channel - to be confirmed from the IWF radio plan and KSS deployment schedule.',
    'Event Control priority route - emergency, safeguarding, welfare, medical, police, evacuation, route compromise, CT and major incident escalation.',
    'Area supervisor call signs - KSS Lead, KSS Deputy, Bars Lead, Sponsors Lead, Pink Moon Lead and other confirmed area leads.',
    'Team call sign format - KSS [Area] [Post/Number], adjusted to the agreed IWF radio plan.',
    'Fallback communications - supervisor mobile contact route held on the live contact sheet if radio failure, dead spot or confidentiality requires phone escalation.'
  ),
  reporting_lines:
    'KSS staff report to their KSS supervisor. KSS supervisors escalate to KSS Lead/Deputy and Event Control. Security concerns are coordinated through the Security Coordinator; crowd issues through Security & Crowd Safety Manager/Event Control; safeguarding through Safeguarding Coordinator/Welfare; alcohol issues through One Circle management/DPS; medical/fire/traffic through the relevant command lead and Event Control.',
  external_interfaces: lines(
    'Event Control - multi-agency communications base and incident logging point.',
    'Hampshire & Isle of Wight Constabulary / Hampshire Police planning route - contact to be reconciled between source plans before final issue.',
    'Isle of Wight NHS Trust - base Event Control, named contact TBC in source documents.',
    'Isle of Wight Fire & Rescue Service - Kate Durham, base Event Control.',
    'Isle of Wight Council - Kevin Winchcombe, base Event Control.',
    'One Circle Events - DPS, bar management, Challenge 25, refusal and Ask Angela controls.',
    'Events Wellbeing - welfare and lost property.',
    'Medical, fire, traffic, accessibility, stewarding and security contractor control teams.'
  ),
  key_contacts_directory: lines(
    'KSS Operational Lead - Floyd Allen - KSS Lead call sign / live contact sheet',
    'KSS Deputy / Escalation Lead - Callum Keegan - KSS Deputy call sign / live contact sheet',
    'KSS Bars / Sponsors / Pink Moon supervisors - post holders to be confirmed from live deployment sheet',
    'Festival Gold - Caroline Giddings - via Event Control',
    'Festival Silver (Days) - Matt Williams - via Event Control',
    'Festival Silver (Nights) - Paul Budden - via Event Control',
    'Event Manager - Steve Porter - Site Management Office / Event Control route',
    'Event Control Manager (Days) - Hector MacPherson',
    'Event Control Manager (Nights) - Andy Turner',
    'Security Coordinator (Days) - Gerry Broadbent',
    'Security Coordinator (Nights) - Dave Thomas',
    'Security & Crowd Safety Manager - Robbie Naish',
    'DPS - Liam Whittaker (One Circle)',
    'Bars Operations Manager - Charlotte Bevan (One Circle)',
    'Safeguarding Coordinator (Days) - Leigh Harvey',
    'Safeguarding Coordinator (Nights) - Lauren Stewart',
    'Medical Commander - Matt Robbins (EMS)',
    'Fire Safety Manager - Dave Raddon (EMFS)',
    'Traffic Manager - Ella Hay (EP Team)',
    'Accessibility Manager - Lindsay Winton',
    'Welfare / Lost Property - Events Wellbeing'
  ),
  control_room_structure:
    'Event Control is managed by the Event Control Manager and reports to Festival Silver. It coordinates partners and stakeholders based in Event Control and across site, manages live incidents, logs decisions and supports operational deployments. Festival Silver chairs daily multi-agency SAG coordination meetings in Event Control using IIMARCH; decisions, actions and rationale are recorded in Ontrack. Physical Event Control co-locates key event departments and external agencies, while Gold/Silver and functional command can continue from separate locations if Event Control is compromised.',
  briefing_and_induction:
    'All KSS staff will receive an Isle of Wight-specific briefing covering allocated Bars/Sponsors/Pink Moon posts, site layout, radio protocol, minimum operating standards, customer service, suspicious behaviour, Challenge 25 support, prohibited-items awareness, event search boundaries, Ask Angela/AER, anti-harassment and spiking awareness, safeguarding indicators, lost property/welfare route, eviction process, incident logging, emergency routes, Show Stop messaging and staff welfare.',
  monitoring_and_density_tools:
    'Monitoring combines Event Control CCTV, area managers, security supervisors, Security & Crowd Safety Manager, spotters, BDO/covert resources, possible drone live feed, bar/sponsor/Pink Moon supervisor reports, staff observation and dynamic risk assessment.',

  service_delivery_scope:
    'KSS service delivery is scheduled across BAR DEPLOYMENTS and OTHER DEPLOYMENTS, including licensed bar locations, Bars Management, Event Control, Pink Moon campsite security, COOP, Sky, Shein and IQOS positions. Duties include SIA/security support to licensed bar and sponsor areas, Pink Moon supervisor/entrance/patrol cover, COOP/Sky/Shein/IQOS support, named bar posts, Event Control support, queue and route protection around assigned footprints, support to One Circle bar staff with Challenge 25/refusals/proxy-sale concerns, anti-harassment and spiking awareness, asset and BOH protection, welfare and safeguarding recognition, suspicious behaviour reporting, emergency route preservation and escalation to Event Control through KSS supervision.',
  build_break_operations:
    'KSS pre-show and post-show operations are scheduled from Saturday 13 June to Monday 22 June 2026. Where deployed outside public show hours, KSS will protect assigned assets/routes, maintain access control, preserve emergency routes, report unsafe activity and follow Site Manager/Event Control direction.',
  specialist_teams_and_assets:
    'Specialist KSS assets include SIA licensed support across bar deployments, Bars Management, Event Control, Pink Moon day/night teams, COOP, Sky, Shein and IQOS. The schedule includes overnight SIA asset protection, day/evening sponsor support, Pink Moon entrance and patrol staffing, and Event Control cover.',
  staffing_by_zone_and_time: lines(...EMP_ISLE_OF_WIGHT_DEPLOYMENT_ROWS),
  response_teams: lines(
    'KSS response pair/team - support refusals, queue congestion, welfare escalation, route compromise and supervisor requests in assigned areas.',
    'Bar response support - support One Circle staff with Challenge 25, proxy sales, signs of intoxication, customer conflict, refusal logging and safe service suspension where assigned.',
    'Sponsor/Pink Moon response support - support sponsor-area and Pink Moon queue congestion, access control, asset protection, welfare recognition and Event Control escalations where assigned.',
    'Scheduled support points include Bars Management, Event Control, named bar deployments, COOP, Sky Open House, Shein FOH, IQOS and Pink Moon day/night campsite posts.'
  ),
  relief_and_contingency:
    'Relief and contingency are managed live by KSS supervisors against E06 Master - IOW26 Security Schedule V1. Supervisors will monitor fatigue, welfare impact, breaks and redeployment needs, escalating shortfalls to KSS Lead/Event Control.',
  escalation_staffing:
    'Escalation staffing may be required for bar queues, sponsor/Pink Moon demand, refusals, welfare issues, route compromise, egress or emergency support. Additional deployment must be authorised through KSS command and Event Control.',
  dynamic_escalation_triggers: lines(
    'Queue tail blocks emergency, accessible, stock or public route.',
    'Bar refusal or proxy-sale concern becomes conflict or welfare issue.',
    'Sponsor/Pink Moon crowd density or customer mood deteriorates.',
    'Person appears vulnerable, intoxicated, distressed, harassed, spiked or at safeguarding risk.',
    'Suspicious behaviour, suspicious item, drone, hostile reconnaissance or crime concern is identified.',
    'Event Control announces route change, Show Stop, evacuation, shelter, lockdown or egress trigger.'
  ),
  bar_operations_roles:
    'KSS bar roles support One Circle bar operations, Challenge 25/refusals, queue control, BOH/stock route protection, anti-harassment/spiking awareness, suspicious behaviour reporting, welfare recognition, asset protection and emergency route preservation.',
  search_screening_roles:
    'No planned KSS search or screening role is identified in the supplied KSS deployment schedule. IWF gate, campsite and accessibility searches are managed through the wider event security model. KSS will only support search activity if formally redeployed by Event Control or the Security Coordinator, and that change must be logged.',
  front_of_stage_roles:
    'Front-of-stage, pit or barrier roles are not identified as KSS scope in the supplied security contractor list. BAR DEPLOYMENTS include Steelers Wheel, Last Chance Saloon and other named bar outlets, which should be treated as bar/stage-area security posts rather than front-of-stage pit/barrier duties.',
  traffic_pedestrian_roles:
    'Traffic management is delivered by Event People Team, with Fairlee Road closures, HVM trigger points, car park routes, bus station routes, taxi/private hire and ferry-linked transport interfaces controlled through the TMP and Event Control. KSS will preserve routes and report route compromise in assigned Bars/Sponsors/Pink Moon areas only unless redeployed by Event Control.',
  camping_security_roles:
    'KSS campsite scope is Pink Moon only. The deployment schedule confirms Pink Moon day and night supervisor, entrance and patrol posts, including Moon, Light, Meadow/Lunar, Tipi, Lodges and Lunar Grove positions. These posts are for campsite security presence, access observation, patrol, welfare recognition, asset protection, route preservation and Event Control escalation. They are not search posts unless Event Control formally redeploys KSS for a specific search task.',
  vip_backstage_roles:
    'VIP, guest, backstage and production roles are not identified as core KSS scope in the supplied security contractor list, except where Bars, Sponsors or Pink Moon posts interface with those areas. Confirm any KSS VIP/backstage/production posts from the deployment schedule.',
  stewarding_roles:
    'Stewarding is delivered by Oxfam and Festaff, with KSS supporting only where its assigned security roles interface with queues, bars, sponsor areas, Pink Moon, welfare, egress or Event Control tasking.',

  ingress_routes_holding_areas:
    'Ingress routes include A2 from festival car parks, A3 from festival bus station, A5 from Fairlee Road/Newport pedestrian arrivals, and A6 for VIP/guest/production. Entry design includes queuing lanes, surrender bins, soft ticket checks, holding areas, screening, bag search, pat-down search, ticket check to wristband, drug dog enhanced search where used, no-bag lanes, Accessibility/VIP/Performer entry and query lanes.',
  search_policy:
    'Searching is controlled by the IWF gate/search operation, not by KSS Pink Moon, bar or sponsor posts unless Event Control formally redeploys KSS. A2/A3 campsite gates use targeted and random searches due to camping luggage; A5 day entry searches all bags and requires pat search for attendees; VIP/guest and accessible entrance searching follows the IWF search model with sensitivity for disability.',
  queue_design:
    'Queue design uses long pedestrian barriers, clear visibility of the queueing process, no-bag lanes, query lanes, surrender bins, search preparation messaging, CCTV and staff/loud hailer instruction to reduce frustration and maintain throughput.',
  overspill_controls:
    'Overspill controls include holding areas before event entry, Fairlee Road traffic closure/HVM trigger plans, additional route protection in Race Course/Fairlee Road areas, Event Control CCTV, senior IWF staff at key locations, stock of barrier for cordons/diversions and dynamic redeployment or show-stop if overcrowding cannot be relieved.',
  accessible_entry_arrangements:
    'Separate Accessibility/VIP and Performer entry is provided and managed through the IWF entry/search operation. KSS staff assigned to bar/sponsor/Pink Moon areas will preserve accessible service points and routes, support welfare handover and escalate adjustment or obstruction issues through supervisors/Event Control.',
  ingress_operations:
    'Ingress operations focus on keeping lanes clear, directing customers to correct lanes, advising on bags/wristbands/search readiness, preserving query lanes, maintaining CCTV and staff observation, supporting Gate Managers and escalating crowd density, congestion or welfare concerns to Event Control.',
  circulation_controls:
    'Circulation controls include free circulation within the perimeter, venue/area manager monitoring, security and steward patrols, CCTV, spotters at key stage areas, drone live feed if deployed by Event Control, barrier adjustment, rebalancing audience distribution and escalation to show-stop protocol in extreme circumstances.',
  high_density_controls:
    'High-density controls include Security & Crowd Safety Manager oversight, Event Control CCTV, spotters, area managers, show-pause/stop messaging, one-in-one-out or closure decisions for venues, route widening/signage changes where practical and dynamic capacity assessment considering density pockets, loading patterns, audience behaviour, dwell time and overflow space.',
  internal_queue_controls:
    'Internal queue controls apply to bars, sponsor areas, Pink Moon, toilets and concessions. KSS will prevent queue tails from blocking emergency routes, accessible routes, service routes or stage/toilet movement, and will request barrier changes, holds, extra staff or Event Control support when needed.',

  transport_interface:
    'Transport interfaces include festival car parks via A2, Southern Vectis/Big Green Coaches via A3 bus station, pedestrian arrivals via A5/Fairlee Road, taxis/private hire/drop-off, Quay Street taxi rank for day visitors, ferry-linked demand through Red Funnel/Wightlink/Hovertravel and traffic management by Event People Team.',
  dispersal_routes:
    'Dispersal uses signed destination and transport-mode routes, exit PA systems, loud hailers, event app, screens, social media, car park signage, bus station load plans, Fairlee Road closure/HVM trigger plans, Green Gate route split to Fairlee Road where needed and partner liaison through Event Control.',
  reentry_policy:
    'Re-entry procedures are controlled by IWF gate/search policy. People passing through re-entry gates should be subject to the same level of searching as first-time entry where applicable.',
  egress_operations:
    'Egress operations include route sweep before egress, vehicle lockdown one hour before egress, closing bars early to support egress where directed, egress meetings at Event Control, destination-specific exit routing, Green Gate split route if demand exceeds capacity, security loud hailers at key positions and Event Control control of the Egress & Dispersal Plan.',

  safeguarding_process:
    'Safeguarding concerns are escalated through Event Control to the Safeguarding Coordinator, Welfare and Medical as appropriate. Security staff identify, protect, report and preserve privacy; they do not conduct safeguarding investigations. Safeguarding Coordinator (Days) is Leigh Harvey and Safeguarding Coordinator (Nights) is Lauren Stewart in the operational structure.',
  safe_spaces:
    'Welfare support is provided by Events Wellbeing. Lost property is transferred to the Welfare Tent, open 24 hours and located at Electric Ladyland in the security plan. KSS staff should use Event Control/Welfare routes for vulnerable customers, harassment, spiking concerns, lost property, lost persons and welfare disclosures.',
  lost_vulnerable_person_process:
    'Lost, vulnerable or distressed persons should be protected, kept under observation, escalated to the KSS supervisor and Event Control, and handed to Welfare/Medical/Safeguarding as directed. Lost property goes to the Welfare Tent/Lost Property Team and illegal items are handed to the Security Coordinator for police liaison or disposal decisions.',
  ask_for_angela_process:
    'One Circle bar briefings include anti-harassment and spiking awareness, Ask Angela and AER. KSS bar support staff should know the nearest welfare route, keep disclosures discreet, avoid public confrontation and escalate to the supervisor/Event Control/Welfare route.',
  confidentiality_logging:
    'Logs must be factual, time-stamped and privacy-aware. Event Control uses Ontrack for decisions, actions and rationale. Bar operations log incidents, accidents, refusals, ID challenges, vouchers/reusable cups and related due-diligence records. CCTV requests and handovers must go through the Security Coordinator.',

  licensable_activities:
    'One Circle Events operates the bar facilities for the sale and supply of alcohol under the Isle of Wight Festival premises licence. Approximately 36 bars are identified in the Alcohol Management Plan, with BOH areas strictly out of bounds to the public and non-authorised One Circle staff.',
  dps_name: 'Liam Whittaker',
  challenge_policy: 'Challenge 25',
  licensing_conditions:
    'Premises Licence Number 26/00266/LAPVDP, Premises Licensing Authority Isle of Wight Council, Premises Address Seaclose Park, Fairlee Road, Newport, Isle of Wight PO30 2DN. Individual bar times vary by bar and the event DPS is Liam Whittaker of One Circle Events.',
  venue_rules:
    'Entry and continued attendance depend on valid ticket/pass/wristband, compliance with search and terms of entry, no prohibited items, no illegal drugs, no weapons, no disruptive or anti-social behaviour, no harassment or discrimination, no unauthorised access and compliance with lawful staff instructions.',
  prohibited_items:
    'Prohibited items include unlawful drugs, weapons, glass, drones unless authorised, pyrotechnics, items that may undermine safety/public order or cause nuisance, and any item prohibited by the current IWF terms and conditions. Alcohol for personal consumption is permitted in campsites subject to IWF rules, but unauthorised alcohol sales are prohibited.',
  incident_management:
    'Incident response prioritises life safety, safeguarding, crowd stability, evidence preservation and accurate Event Control escalation. Security Coordinators coordinate security response from Event Control; incidents and crimes of note are recorded on Ontrack. KSS staff should make the immediate area safe, notify the KSS supervisor/Event Control, preserve evidence where relevant, request welfare/medical/police support through Event Control and keep records factual.',

  risk_assessment_methodology:
    'This risk assessment is derived from the supplied IWF ESOP, Risk Assessment, Crowd Management Plan, DIMALICED workbook, Security Plan, Public Facing Document, Alcohol Management Plan and E06 Master - IOW26 Security Schedule V1. KSS-specific risk should be reviewed again if the live deployment sheet changes posts, quantities, shift times or supervisor structure.',
  risk_assessment_scope:
    'The KSS risk assessment covers Bars, Sponsors and Pink Moon security support, bar queues/refusals, sponsor/Pink Moon queue congestion, welfare recognition, safeguarding escalation, suspicious behaviour, route protection, emergency interface, egress support and incident reporting.',
  risk_assessment_source_notes:
    'Source documents identify a 23rd-year four-day festival from 18 June 2026 to 21 June 2026 at Seaclose Park, Medina College playing fields and North Fairlee Farm, with anticipated attendance around 60,000 and licensed capacity 89,999. KSS is listed as security contractor for Bars, Sponsors and Pink Moon, and E06 Master - IOW26 Security Schedule V1 gives the detailed KSS deployment table for 13-22 June 2026.',
  additional_operational_risks: lines(
    'Bar refusal conflict - customers, One Circle staff and KSS - Challenge 25 support, calm de-escalation, refusal logging, welfare check and Event Control escalation where conflict or vulnerability emerges.',
    'Proxy sale or underage alcohol concern - under-18s, bar staff and KSS - Challenge 25 checks, proxy-sale awareness, refusal logging, supervisor escalation and no unmanaged handover to ejection.',
    'Sponsor/Pink Moon queue congestion - customers and staff - queue cap, route protection, barrier adjustment, additional staff request and Event Control escalation.',
    'Safeguarding or vulnerable-person concern during refusal/ejection - child, vulnerable adult or temporarily vulnerable person - pause removal, contact Event Control/Safeguarding/Welfare and record factual security actions.',
    'Suspicious behaviour or hostile reconnaissance - public and staff - report early via KSS supervisor/Event Control using security briefing principles; do not dismiss low-level concerns.',
    'Fairlee Road or transport disruption affecting egress - public, residents and KSS staff - follow Event Control/TMP instructions, protect assigned routes and support factual public messaging.'
  ),

  emergency_procedures:
    'Emergency procedures are directed by Festival Gold/Silver and Event Control. IWF evacuation levels include localised, partial and total evacuation. KSS duties are to protect life, stop or hold local activity where instructed, keep queues and routes clear, support vulnerable/disabled persons, preserve emergency access, report route status and follow Event Control instructions.',
  partial_evacuation_procedure:
    'For localised or partial evacuation of a KSS bar, sponsor or Pink Moon area, KSS stops entry, collapses or redirects the local queue, protects adjoining routes, supports vulnerable/disabled persons, updates Event Control through the supervisor and prevents re-entry until authorised.',
  full_evacuation_procedure:
    'For full evacuation, KSS follows Event Control instructions and directs customers to the appropriate exits. Main Arena evacuation routes include Red Gate, Octopus Gate, White Gate 1, White Gate 2, Green Gate, Production Gate A6 and Gate A7; Fairlee Road and Quayside/Newport routes are used as directed.',
  lockdown_invacuation_procedure:
    'For lockdown or invacuation, KSS follows Event Control/Festival Silver direction, moves people away from exposed areas where safe, stops entry to assigned areas, keeps radio traffic factual, reports suspicious activity and follows ACT/Run Hide Tell principles.',
  shelter_procedure:
    'Shelter may be required for severe weather or lightning. KSS identifies local shelter or safe waiting options only under Event Control direction, keeps queues from building at unsafe shelter points, supports disabled/vulnerable persons and reports route congestion or crowd density concerns.',
  show_stop_triggers:
    'Show pause/stop may be used for emergency, crowd management, lightning/storm or evacuation. Pre-programmed messages include requests to make space, look after each other, stop the show, leave by nearest emergency exit/gate and avoid sheltering under trees during storm conditions.',
  rendezvous_points:
    'Default muster points are not practical due to site scale. Safe muster points are identified dynamically by Event Gold/Silver, Event Management and Health & Safety teams for the type of evacuation. KSS should follow Event Control instructions and provide exact gate, venue, bar/sponsor/Pink Moon location and landmark references.',
  command_escalation:
    'Emergency escalation goes from KSS staff to KSS supervisor, then Event Control/Security Coordinator/Festival Silver as appropriate. Festival Gold is responsible for critical safety decisions and emergency/major incident response; Festival Silver is empowered to make life-safety tactical decisions if Gold cannot be contacted in time.',
  emergency_search_zones:
    'Emergency area checks for KSS include assigned bars, sponsor areas, Pink Moon, BOH areas, queues, stock routes, immediate public interfaces and any route or area assigned by Event Control. Suspicious items are handled under HOT and 4Cs principles through Event Control/Security Coordinator.',

  ct_procedures:
    'The Security Plan includes CT, BDO, covert, CCTV, drone and suspicious behaviour briefings. KSS staff must report hostile reconnaissance, suspicious behaviour, suspicious items, unattended items, drone activity, weapons concerns, vehicle threats or unusual activity to the supervisor/Event Control without delay.',
  suspicious_item_protocol:
    'Do not touch or move suspicious items. Use HOT assessment, clear or hold the immediate area if safe, protect routes, communicate exact location and description to KSS supervisor/Event Control, and await Security Coordinator/Police direction.',
  hostile_recon_indicators:
    'Indicators include unusual filming or observation of barriers, queues, emergency routes, vehicle mitigation, staff rotations or restricted areas; testing staff reactions; detailed security questions; loitering without plausible purpose; pass-back attempts; abandoned bags; or attempts to distract staff while another person observes controls.',
  run_hide_tell_guidance:
    'For a weapons or marauding threat, leave by a safe route if possible, hide if escape is unsafe, silence phones, barricade where possible and tell police/Event Control when safe. KSS staff prioritise life safety and direction, not pursuit.',

  staff_welfare_arrangements:
    'KSS supervisors will monitor fatigue, hydration, breaks, welfare impact after difficult incidents, overnight tiredness, radio stress and exposure to conflict. Staff can be rotated away from difficult incidents and should know welfare, medical and supervisor routes.',

  accessibility_arrangements:
    'The event provides accessible routes, accessible service points, Accessibility/VIP/Performer entry, accessible facilities and an Accessibility Manager. KSS will preserve accessible service and movement routes in assigned areas, support additional time/privacy needs and escalate obstruction or adjustment concerns.',
  accessibility_team_liaison:
    'Accessibility Manager is Lindsay Winton. KSS accessibility issues in assigned areas should be escalated through KSS supervision to Event Control/Accessibility, especially where queues, bar service, sponsor areas or Pink Moon routes affect disabled customers.',

  communications_plan:
    'Operational communications use Event Control, radio, Ontrack logging, CCTV, IIMARCH briefings, event app, social media, PA systems, big screens, LED/variable messaging, loud hailers, information points and direct staff communication with patrons.',
  sitrep_decision_logging:
    'SITREPs should be provided by KSS supervisors at shift start, pre-opening, during bar/sponsor/Pink Moon peaks, headline periods, egress and stand-down. Logs should record time, location, issue, action, owner, escalation and outcome.',
  refusal_false_id_protocol:
    'One Circle operates Challenge 25. People who appear under 25 must produce acceptable ID before alcohol service. Bar staff take dubious ID to the Bar Manager; suspicious ID may be temporarily retained through the bailment process and escalated to Head of Security/Event Manager. Alcohol refusal reports must be logged for refused alcohol sales, including underage, intoxication and proxy-sale concerns.',
  ejection_protocol:
    'Eviction is managed by the Eviction Team unless the person has first been arrested. Wristbands are removed by the Eviction Team, not KSS or Police. Reasons include no ticket/pass/wristband, unacceptable/disruptive/anti-social behaviour, arrest/caution or criminal offence, refusal to submit to search, harassment/discrimination, illegal activity, drugs, unauthorised selling or actions compromising a safe festival. KSS supports safe escort, evidence and witness information through the Security Coordinator/Event Control route.',
  confiscation_process:
    'Surrendered, seized or confiscated items follow the IWF search/seizure and alcohol management procedures. Illegal items are recorded and handed to the Security Coordinator for possible police liaison or disposal decisions. Fake/dubious ID follows the One Circle bailment and local authority handover process.',
  ejection_safeguarding:
    'Juveniles are defined by the eviction policy as 17 and under. If a juvenile or vulnerable adult is being considered for eviction, welfare and safeguarding checks must be completed through the Eviction Team, Safeguarding Coordinator, Welfare Manager and Security Coordinator. If no responsible adult can be contacted or abandonment/neglect is suspected, Event Gold and Police/Social Care escalation must be considered through the Security Coordinator route.',

  debrief_reporting:
    'KSS supervisors complete debriefs covering staffing, bar refusals, sponsor/Pink Moon demand, welfare referrals, safeguarding concerns, Ask Angela/spiking concerns, suspicious behaviour, route issues, incidents, egress and recommendations.',
  close_down_operations:
    'Close-down includes bar/sponsor/Pink Moon queue clear-down, asset checks, stock route protection, welfare route preservation, incident reconciliation and confirmation to Event Control before KSS stands down an area.',
  end_of_shift_reporting:
    'End-of-shift reports will include staffing, incidents, refusals, ejections, search issues, welfare/safeguarding handovers, route obstructions, equipment, lost property and outstanding actions.',
  asset_security_demobilisation:
    'KSS asset protection covers assigned bar, sponsor and Pink Moon assets, queue barriers, BOH access, radios, PPE, signage and local infrastructure until handed over or stood down.',
  health_safety_overview:
    'KSS staff follow site induction, dynamic risk assessment, PPE requirements, manual handling expectations, radio discipline, welfare procedures, incident escalation and emergency route protection. Hazards or near misses are reported immediately.',

  site_maps_and_route_diagrams: lines(
    '1.7 IWF Site Plan 2026 V7',
    'IWF ingress, circulation and egress plans referenced by the Crowd Management Plan',
    '4.0b IWF DIMALICE Normal & Emergency 2026 V1',
    'E06 Master - IOW26 Security Schedule V1 for bar deployments, Pink Moon, COOP, Sky, Shein, IQOS and Event Control deployment rows',
    'Emergency exit and emergency vehicle access plan - produced no later than 2 weeks prior to the festival in the crowd plan'
  ),
  appendix_notes: lines(
    'Appendix A - Bar Operations annex, aligned to One Circle AMP and KSS bar support duties',
    'Appendix B - Sponsor and bar high-demand queue area controls, aligned to KSS assigned posts',
    'Appendix C - Pedestrian, egress, route and Fairlee Road interface annex',
    'Appendix D - Pink Moon campsite security annex for assigned entrance, patrol and welfare-recognition posts',
    'Appendix E - Safeguarding, welfare and vulnerable-person escalation annex',
    'Appendix F - Emergency Action Cards, aligned to IWF Emergency/Crowd/Show Stop plans'
  ),
  version_history_summary: lines(
    'V1.0 - Initial Isle of Wight Festival 2026 KSS EMP cloned from the previous festival scaffold.',
    'V1.1 - Source information inserted from supplied IWF ESOP, operational management, site plan, public-facing document, risk assessment, crowd management plan, DIMALICED workbook, security plan and alcohol management plan.',
    'V1.2 - KSS deployment rows inserted from E06 Master - IOW26 Security Schedule V1 using the same detailed deployment table format as the previous festival EMP; 285 aggregated EMP rows cover 469 staff-shifts across Bars, Sponsors, Pink Moon and Event Control, with no planned KSS search annex.'
  ),
  contact_directory: lines(
    'KSS Operational Lead - Floyd Allen - KSS Lead call sign / live contact sheet',
    'KSS Deputy / Escalation Lead - Callum Keegan - KSS Deputy call sign / live contact sheet',
    'KSS Bars / Sponsors / Pink Moon supervisors - post holders to be confirmed from live deployment sheet',
    'Festival Gold - Caroline Giddings - via Event Control',
    'Festival Silver (Days) - Matt Williams - via Event Control',
    'Festival Silver (Nights) - Paul Budden - via Event Control',
    'Event Manager - Steve Porter - Site Management Office / Event Control route',
    'Event Control Manager (Days) - Hector MacPherson',
    'Event Control Manager (Nights) - Andy Turner',
    'Security Coordinator (Days) - Gerry Broadbent',
    'Security Coordinator (Nights) - Dave Thomas',
    'Security & Crowd Safety Manager - Robbie Naish',
    'Designated Premises Supervisor - Liam Whittaker (One Circle)',
    'Bars Operations Manager - Charlotte Bevan (One Circle)',
    'Safeguarding Coordinator (Days) - Leigh Harvey',
    'Safeguarding Coordinator (Nights) - Lauren Stewart',
    'Medical Commander - Matt Robbins (EMS)',
    'Fire Safety Manager - Dave Raddon (EMFS)',
    'Traffic Manager - Ella Hay (EP Team)',
    'Accessibility Manager - Lindsay Winton',
    'Welfare / Lost Property - Events Wellbeing',
    'Isle of Wight Council - Kevin Winchcombe - Event Control',
    'Isle of Wight Fire & Rescue Service - Kate Durham - Event Control'
  ),
}
