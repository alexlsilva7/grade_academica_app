from pathlib import Path
import json
import pdfplumber
import sys
sys.stdout.reconfigure(encoding='utf-8')

base = Path('C:/Users/alexl/Downloads/ABDM/Documents')
sources = {
    'prerequisitos': 'PPC DO CURSO DE MEDICINA VETERINÁRIA APROVADO - 2026.1 - Pré-requisitos.pdf',
    'ppc': 'PPC DO CURSO DE MEDICINA VETERINÁRIA UFAPE APROVADO PELO CONSEPE - SEMESTRE 2026.1.pdf',
    'matriz': 'Matriz curricular MVET02.pdf',
    'perfil_acex': 'PERFIL DO  PPC - MVET02 COM INCLUSÃO DE ACEX 440 HORAS - 2026.pdf',
}
out = Path(__file__).parent
for key, filename in sources.items():
    if (out / f'{key}.json').exists():
        continue
    with pdfplumber.open(base / filename) as doc:
        pages = [{'page': i + 1, 'width': p.width, 'height': p.height, 'text': p.extract_text() or ''} for i,p in enumerate(doc.pages)]
    (out / f'{key}.json').write_text(json.dumps({'file':filename,'pages':pages},ensure_ascii=False,indent=2),encoding='utf-8')
    (out / f'{key}.txt').write_text('\n\n'.join(f'=== PAGINA {p["page"]} ===\n{p["text"]}' for p in pages),encoding='utf-8')
    print(key, len(pages), 'pages', sum(len(p['text']) for p in pages), 'chars')
    print('\n'.join(f"{p['page']}: {p['text'][:120].replace(chr(10), ' ')}" for p in pages))
