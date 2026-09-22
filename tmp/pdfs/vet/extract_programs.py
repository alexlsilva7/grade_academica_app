from pathlib import Path
import json,sys,re
import pdfplumber
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent
base=Path('C:/Users/alexl/Downloads/ABDM/Documents')
manifest=json.loads((root/'ppc.json').read_text(encoding='utf-8'))
selected=[p['page'] for p in manifest['pages'] if 'PROGRAMA DE COMPONENTE CURRICULAR' in p['text']]
out={}
with pdfplumber.open(base/manifest['file']) as pdf:
    for n in selected:
        page=pdf.pages[n-1]
        ts=page.find_tables()
        tables=[]
        for table in ts:
            cells=[]
            for cell in table.cells:
                text=page.crop(cell).extract_text() or ''
                if text.strip(): cells.append({'bbox':cell,'text':text})
            tables.append({'rows':table.extract(),'cells':cells})
        out[str(n)]=tables
        print(n, len(tables),flush=True)
(root/'programs-tables.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')

old=json.loads((root/'perfil_acex.json').read_text(encoding='utf-8'))
with pdfplumber.open(base/old['file']) as pdf:
    tables={str(n):pdf.pages[n-1].extract_tables() for n in [14,15,16,17,18,33,34,35,36,37,38,39,40]}
(root/'old-tables.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2),encoding='utf-8')
