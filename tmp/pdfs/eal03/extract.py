import json
from pathlib import Path

import pdfplumber

source = Path(r'C:/Users/alexl/Downloads/ABDM/Documents/PPC de Engenharia de Alimentos - Perfil EAL03 - Ingresso a partir de 2024.2.pdf')
output = Path(__file__).parent

with pdfplumber.open(source) as document:
    pages = [
        {'page': index + 1, 'text': page.extract_text() or '', 'tables': page.extract_tables()}
        for index, page in enumerate(document.pages)
    ]

(output / 'ppc.json').write_text(
    json.dumps({'file': source.name, 'pages': pages}, ensure_ascii=False, indent=2),
    encoding='utf-8',
)
(output / 'ppc.txt').write_text(
    '\n\n'.join(f"=== PAGINA {page['page']} ===\n{page['text']}" for page in pages),
    encoding='utf-8',
)

print('pages', len(pages))
for page in pages:
    if 'MATRIZ CURRICULAR' in page['text'] or 'CÓDIGO' in page['text']:
        print(page['page'], page['text'][:180].replace('\n', ' '))
