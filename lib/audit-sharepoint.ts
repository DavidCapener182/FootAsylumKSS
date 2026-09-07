// Exact folder names inspected in SharePoint on 7 September 2026.
// These are store folder links, not date-matched PDF links.
const ARCHIVE_ROOT = '/Shared Documents/Operations Clients Drive/Footasylum Ltd/2026 Audits'

const STORE_AUDIT_FOLDERS: Readonly<Record<string, string>> = {
  "S0005": "S0005 - Preston/S0005 - Preston H&S Audit",
  "S0006": "S0006 - Middlesbrough/S0006 - Middlesbrough H&S Audit",
  "S0007": "S0007 - Manchester Womans/S0007 - Manchester Womans H&S Audit",
  "S0014": "S0014 - Hanley/S0014 - Hanley H&S Audit",
  "S0015": "S0015 - Liverpool One/S0015 - Liverpool One H&S Audit",
  "S0017": "S0017 - Bolton/S0017 - Bolton H&S Audit",
  "S0021": "S0021 - Glasgow Argyle/S0021 - Glasgow Argyle H&S Audit",
  "S0022": "S0022 - Birmingham Fort/S0022 - Birmingham Fort H&S Audit",
  "S0023": "S0023 - Cardiff/S0023 - Cardiff H&S Audit",
  "S0027": "S0027 - Bluewater/S0027 - Bluewater H&S Audit",
  "S0029": "S0029 - Merry Hill/S0029 - Merry Hill H&S Audit",
  "S0030": "S0030 - Stratford/S0030 - Stratford H&S Audit",
  "S0032": "S0032 - Croydon/S0032 - Croydon H&S Audit",
  "S0037": "S0037 - Nottingham Clumber St/S0037 - Nottingham Clumber St. H&S Audit",
  "S0040": "S0040 - Trafford Mega/S0040 - Trafford Mega H&S Audit",
  "S0042": "S0042 - Speke/S0042 - Speke H&S Audit",
  "S0044": "S0044 - Leeds/S0044 - Leeds H&S Audit",
  "S0045": "S0045 - Coventry/S0045 - Coventry H&S Audit",
  "S0046": "S0046 - Portsmouth/S0046 - Portsmouth H&S Audit",
  "S0048": "S0048 - Bradford/S0048 - Bradford H&S Audit",
  "S0049": "S0049 - Bromley/S0049 - Bromley H&S Audit",
  "S0053": "S0053 - Dundee/S0053 - Dundee H&S Audit",
  "S0055": "S0055 - Walsall/S0055 - Walsall H&S Audit",
  "S0056": "S0056 - Glasgow Fort/S0056 - Glasgow Fort H&S Audit",
  "S0057": "S0057 - Sunderland/S0057 - Sunderland H&S Audit",
  "S0060": "S0060 - Plymouth/S0060 - Plymouth H&S Audit",
  "S0061": "S0061 - Newport/S0061 - Newport H&S Audit",
  "S0064": "S0064 - Milton Keynes/S0064 - Milton Keynes H&S Audit",
  "S0065": "S0065 - Blackburn/S0065 - Blackburn H&S Audit",
  "S0066": "S0066 - Carlisle/S0066 - Carlisle H&S Audit",
  "S0067": "S0067 - Hull/S0067 - Hull H&S Audit",
  "S0068": "S0068 - Edge Lane/S0068 - Edge Lane H&S Audit",
  "S0069": "S0069 - Broughton Park/S0069 - Broughton Park H&S Audit",
  "S0070": "S0070 - White Rose/S0070 - White Rose H&S Audit",
  "S0071": "S0071 - Bury/S0071 - Bury H&S Audit",
  "S0072": "S0072 - Meadowhall/S0072 - Meadowhall H&S Audit",
  "S0074": "S0074 - Thanet/S0074 - Thanet H&S Audit",
  "S0075": "S0075 - Denton/S0075 - Denton H&S Audit",
  "S0076": "S0076 - Brighton/S0076 - Brighton H&S Audit",
  "S0078": "S0078 - Derby/S0078 - Derby H&S Audit",
  "S0079": "S0079 - Southampton/S0079 - Southampton H&S Audit",
  "S0080": "S0080 - Blackpool/S0080 - Blackpool H&S Audit",
  "S0081": "S0081 - Braehead/S0081 - Braehead H&S Audit",
  "S0082": "S0082 - Fosse Park/S0082 - Fosse Park H&S Audit",
  "S0083": "S0083 - White City/S0083 - White City H&S Audit",
  "S0084": "S0084 - Newcastle/S0084 - Newcastle H&S Audit",
  "S0085": "S0085 - Cheshunt/S0085 - Cheshunt H&S Audit",
  "S0086": "S0086 - Oxford Street/S0086 - Oxford Street H&S Audit",
  "S0087": "S0087 - Bull ring new/S0087 - Bull ring new H&S Audit",
  "S0088": "S0088 - Lakeside New/S0088 - Lakeside New H&S Audit",
  "S0089": "S0089 - Watford New Store/S0089 - Watford New Store H&S Audit",
  "S0090": "S0090 - Metro New/S0090 - Metro New H&S Audit",
  "S0091": "S0091 - Aberdeen/S0091 - Aberdeen H&S Audit",
  "S0092": "S0092 - Warrington/S0092 - Warrington H&S Audit",
  "S0093": "S0093 - Doncaster/S0093 - Doncaster H&S Audit",
  "S0095": "S0095 - Rotherham/S0095 - Rotherham H&S Audit",
  "S0096": "S0096 - Wrexham/S0096 - Wrexham H&S Audit",
  "S0097": "S0097 - West Bromwich/S0097 - West Bromwich H&S Audit",
  "S0098": "S0098 - Parc Trostre/S0098 - Parc Trostre H&S Audit",
  "S0118": "S0118 - Wakefield/S0118 - Wakefield H&S Audit",
  "S0119": "S0119 - Bradford Forster Square/S0119 - Bradford Forster Square H&S Audit",
  "S0120": "S0120 - Bromborough/S0120 - Bromborough H&S Audit",
  "S0121": "S0121 - Wigan/S0121 - Wigan H&S Audit",
  "S0122": "S0122 - Glasgow Silverburn/S0122 - Glasgow Silverburn H&S Audit",
  "S0777": "S0777 - Sevenstore/S0777 - Sevenstore H&S Audit",
  "S0900": "S0900 - Photo Studio/S0900 - Photo Studio H&S Audit",
  "S0904": "S0904 - Manchester Arndale/S0904 - Manchester Arndale H&S Audit",
  "S0913": "S0913 - Darlington/S0913 - Darlington H&S Audit",
  "S0914": "S0914 - Stockton/S0914 - Stockton H&S Audit",
  "WH003": "WH003 - Heywood/WH003 - Heywood H&S Audit",
  "WH004": "WH004 - Middleton/WH004 - Middleton H&S Audit",
  "S0125": "S0125 - Merthyr Tydfil/S0125 - Merthyr Tydfil H&S Audit"
}

export interface AuditSharePointFolder {
  url: string
  path: string
}

export function getAuditSharePointFolder(
  storeCode: string | null,
  storeName?: string,
): AuditSharePointFolder | null {
  const code = storeCode?.trim().toUpperCase()
  const folder = code && Object.prototype.hasOwnProperty.call(STORE_AUDIT_FOLDERS, code)
    ? STORE_AUDIT_FOLDERS[code]
    : !code && storeName === 'Trafford Centre New Store'
      ? 'Trafford Centre New/Trafford Centre New H&S Audit'
      : null
  if (!folder) return null
  const path = `${ARCHIVE_ROOT}/${folder}`
  return {
    path,
    url: `https://kssnwlimited.sharepoint.com/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(path)}`,
  }
}
