"""Read-only line extraction from referenced FRA action-plan pages.

This emits PDF-sourced candidates, not verified open/remedial actions. Human
review of the issued document and completion evidence is still required.
"""

import json
import re
from pathlib import Path

import fitz

ROOT = Path('output/fra-issued-pdf-review-2026-09-25')
manifest = json.loads((ROOT / 'manifest.json').read_text())
rows = []
stores = []


def action_pages(doc):
    for page_number, page in enumerate(doc, 1):
        text = page.get_text()
        if 'Recommended Actions:' in text:
            yield page_number, text


for ref in manifest:
    if not ref.get('filename'):
        stores.append({**ref, 'actionPages': [], 'rowCount': 0, 'issue': ref.get('error', 'PDF unavailable')})
        continue
    document = fitz.open(ROOT / ref['filename'])
    page_refs = []
    before = len(rows)
    for page_number, text in action_pages(document):
        page_refs.append(page_number)
        content = text.split('Recommended Actions:', 1)[1]
        # Modern KSS FRA pages use explicit Priority / Action columns. A legacy
        # SafetyCulture heading with no rows remains an empty review case.
        if not re.search(r'\bPriority\s+Action\b', content):
            continue
        content = re.split(r'\bPriority\s+Action\b', content, maxsplit=1)[1]
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        current = None

        def flush():
            if not current:
                return
            recommendation = ' '.join(current['parts'])
            recommendation = re.sub(r'(?<=\w)- (?=\w)', '-', recommendation)
            recommendation = re.sub(r'\s+', ' ', recommendation).strip()
            if recommendation:
                rows.append({
                    'storeId': ref['storeId'],
                    'storeCode': ref['storeCode'],
                    'storeName': ref['storeName'],
                    'pdfPath': ref['path'],
                    'pdfSha256': ref['sha256'],
                    'page': page_number,
                    'sourceOrdinal': len(rows) - before + 1,
                    'recommendation': recommendation,
                    'priority': current['priority'],
                    'sourceKind': 'pdf_action_plan_candidate',
                    'reviewRequired': True,
                })

        for line in lines:
            if line in ('Low', 'Medium', 'High'):
                flush()
                current = {'priority': line, 'parts': []}
                continue
            if re.match(r'^\d{1,2}/\d{1,2}/\d{4},', line) or re.match(r'^\d+\s*/\s*\d+$', line):
                break
            if line.startswith(('KSS x Footasylum Audit Platform', 'https://', 'Private & confidential')):
                break
            if current:
                current['parts'].append(line)
        flush()
    count = len(rows) - before
    stores.append({
        'storeId': ref['storeId'], 'storeCode': ref['storeCode'], 'storeName': ref['storeName'],
        'pdfPath': ref['path'], 'pdfSha256': ref['sha256'], 'actionPages': page_refs,
        'rowCount': count, 'issue': None if count else ('Action Plan found with no extractable rows' if page_refs else 'No Recommended Actions heading found'),
    })

(ROOT / 'pdf-action-rows.json').write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
(ROOT / 'store-review.json').write_text(json.dumps(stores, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'stores': len(stores), 'pdfActionRows': len(rows), 'storesWithRows': sum(s['rowCount'] > 0 for s in stores), 'storesWithoutRows': sum(s['rowCount'] == 0 for s in stores)}))
