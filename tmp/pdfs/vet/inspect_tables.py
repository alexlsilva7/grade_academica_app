from pathlib import Path
import json, sys
import pdfplumber
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent
base=Path('C:/Users/alexl/Downloads/ABDM/Documents')
for key, selected in [('prerequisitos', list(range(1,15))), ('ppc',[16,65,74,163,164,165,166,200,250])]:
    manifest=json.loads((root/f'{key}.json').read_text(encoding='utf-8'))
    with pdfplumber.open(base/manifest['file']) as doc:
        result={str(n):doc.pages[n-1].extract_tables() for n in selected}
    (root/f'{key}-tables.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(key,[(n,len(t)) for n,t in result.items()])
    for n in (['1','9','13'] if key=='prerequisitos' else ['200']):
        print(n,json.dumps(result[n],ensure_ascii=False))
