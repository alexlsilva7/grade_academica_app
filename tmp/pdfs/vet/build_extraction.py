"""Build a fresh, source-traceable extraction; never reads application course data."""
from pathlib import Path
import json, re, sys, unicodedata, hashlib
sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).parent
OUT = Path('output/medicina-veterinaria')
OUT.mkdir(parents=True, exist_ok=True)
def read(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))
sources = {k: read(k+'.json') for k in ['ppc','prerequisitos','matriz','perfil_acex']}
def clean(s): return re.sub(r'\s+', ' ', s or '').strip()
def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD',clean(s)).encode('ascii','ignore').decode().lower())
def number(s):
    s = re.sub(r'\s+', '', s or '')
    return int(s) if s.isdigit() else None
def ev(field,key,page,text): return dict(field=field,file=sources[key]['file'],page=page,excerpt=clean(text))
issues=[]
def issue(record,field,message): issues.append(dict(severity='warning',record=record,field=field,message=message))
def write(n,obj): (OUT/n).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Position-aware extraction of content next to vertically centred PDF labels.
programs={}
for p,tables in read('programs-tables.json').items():
    if not tables: continue
    t=tables[0]; rows=t['rows']; cells=t['cells']
    def beside(label):
        labs=[c for c in cells if norm(c['text'])==norm(label)]
        if not labs:return []
        a=labs[0]['bbox']; y=(a[1]+a[3])/2
        return [c['text'] for c in sorted(cells,key=lambda c:c['bbox'][0]) if c['bbox'][0]>=a[2]-1 and c['bbox'][1]-1<=y<=c['bbox'][3]+1]
    header=next(r for r in rows if r[0]=='COMPONENTE')
    vals=[clean(x) for x in header if x]
    code=vals[-1]; name=vals[1]
    ch=next((r for r in rows if r[0]=='CH'),[])
    nums=[number(x) for x in ch if number(x) is not None]
    credits=next((number(x) for r in rows if r[0]=='CARÁTER DA' for x in reversed(r) if number(x) is not None),None)
    pre=beside('PRÉ-REQUISITO'); eq=beside('EQUIVALÊNCIA(S)'); ementa=beside('EMENTA')
    programs[code]={'code':code,'name':name,'page':int(p),'credits':credits,'hours':dict(zip(['teorica','pratica','ead','pcc','total'],nums)),
        'prerequisiteRule':clean(pre[0]) if pre else None,'prerequisiteCodes':clean(pre[-1]) if len(pre)>1 else None,
        'equivalenceRule':clean(eq[0]) if eq else None,'equivalenceCodes':clean(eq[-1]) if len(eq)>1 else None,
        'ementa':clean(ementa[0]) if ementa else None}

new=[]; slots=[]
for page,tables in read('prerequisitos-tables.json').items():
    for table in tables:
        for r in table:
            if len(r)!=9:continue
            code=clean(r[0]); name=clean(r[1]); period=int(page) if int(page)<=10 else 'Optativa'
            if not re.fullmatch(r'[A-Z]+[A-Z0-9]*\d{2,}',code):
                if name.startswith('Optativa '):slots.append(dict(name=name,period=period,hours=number(r[6]),evidence=[ev('hours','prerequisitos',int(page),' | '.join(x or '' for x in r))]))
                continue
            hours=dict(zip(['teorica','pratica','pcc','ead','total'],[number(x) for x in r[2:7]]))
            s=dict(id='MVET03-'+code,code=code,name=name,type='Optativa' if period=='Optativa' else 'Obrigatória',period=period,profile='MVET03',credits=None,
                   workload={k:hours[k] for k in ['teorica','pratica','total']},pccHours=hours['pcc'],eadHours=hours['ead'],prerequisites=None,corequisites=None,equivalences=None,
                   prerequisiteRule=clean(r[7]),equivalenceRule=clean(r[8]),ementa=None,evidence=[ev('matrix','prerequisitos',int(page),' | '.join(x or '' for x in r))],sourceClaims={'matrix':dict(code=code,hours=hours,prerequisiteRule=clean(r[7]),equivalenceRule=clean(r[8]))})
            s['workload']['extensao']=None
            new.append(s)
new.append(dict(id='MVET03-EDUF3001',code='EDUF3001',name='Educação Física A',type='Obrigatória',period=None,offeredPeriods=list(range(1,8)),profile='MVET03',credits=None,workload=dict(teorica=None,pratica=None,extensao=None,total=30),prerequisites=None,corequisites=None,equivalences=None,prerequisiteRule=None,equivalenceRule=None,ementa=None,evidence=[],sourceClaims={}))
for s in new:
    p=programs.get(s['code']) or (programs.get('UAG00232') if s['code']=='UAG0O232' else None)
    if not p:
        issue(s['id'],'ementa','Programa não localizado automaticamente no PPC.');continue
    s['sourceClaims']['program']=p
    s['credits']=p['credits'];s['ementa']=p['ementa']
    s['evidence'] += [ev('program','ppc',p['page'],f"{p['code']} {p['name']}; CH {p['hours']}; créditos {p['credits']}"),ev('ementa','ppc',p['page'],p['ementa'])]
    if s['code']!=p['code']:
        issue(s['id'],'code',f"Código divergente: matriz {s['code']}; programa {p['code']} (PPC p. {p['page']}). Código consolidado nulo.")
        s['code']=None
    for key in ['teorica','pratica','total']:
        a=s['workload'][key];b=p['hours'].get(key)
        if a is not None and b is not None and a!=b:
            issue(s['id'],'workload.'+key,f'Matriz informa {a} h; programa informa {b} h (PPC p. {p["page"]}). Valor consolidado nulo.')
            s['workload'][key]=None
        elif a is None:s['workload'][key]=b
    for key in ['pcc','ead']:
        s[key+'Hours']=p['hours'].get(key)
    # Preserve both prerequisite texts; codes in programme are an explicit source.
    raw=p['prerequisiteCodes'] or ''; rule=p['prerequisiteRule'] or ''
    codes=re.findall(r'\b[A-Z]{3,5}\d{4,5}\b',raw)
    if codes:s['prerequisites']=[dict(code=c,name=None,id='MVET03-'+c) for c in codes]
    elif norm(rule) in ['naoexiste','naoha','nenhum']:s['prerequisites']=[]
    # Complex completion conditions must not be reduced to a simple graph.
    if s['id'] in ['MVET03-MVET0052','MVET03-MVET0053','MVET03-MVET0054']:
        s['prerequisites']=None
        issue(s['id'],'prerequisites','Há condições de integralização. Consultar os dois textos em sourceClaims; a lista simples foi deixada nula.')
    if not s['prerequisiteRule']:s['prerequisiteRule']=rule
    s['programPrerequisiteRule']=rule

# Old-profile matrix transcribed from the supplied single-page PDF and its image.
matrix='''Anatomia Descritiva dos Animais Domésticos I|120;Bioestatística Básica|45;Química Biológica I|60;Análise Química Veterinária|45;Filosofia da Ciência e Ética|45;Introdução à Economia|60
Anatomia Topográfica dos Animais Domésticos|120;Bioestatística Experimental|60;Bioquímica IV|90;Biofísica|60;Fundamentos de Economia Rural|45
Fisiologia Veterinária Básica|60;Parasitologia Veterinária|60;Microbiologia Geral|75;Histologia e Embriologia Veterinária I|60;Agrostologia|60;Administração e Planejamento Rural|60
Fisiologia Especial dos Animais Domésticos|75;Imunologia Veterinária|45;Nutrição Animal|60;Histologia e Embriologia Veterinária II|60;Genética Básica e Biotecnologia|75;Zootecnia Geral S|60
Patologia Geral e Técnica de Necropsia dos Animais Domésticos|90;Patologia Clínica Veterinária S|75;Semiologia Veterinária|60;Anestesiologia|30;Zootecnia Especial I|60;Farmacologia|60
Patologia Especial dos Animais Domésticos|105;Técnica Cirúrgica Veterinária S|75;Ecologia Básica e Conservacionismo|60;Terapêutica Veterinária|75;Zootecnia Especial II|60
Andrologia e Biotecnologia da Reprodução|60;Clínica Cirúrgica Veterinária S|75;Epidemiologia e Planejamento em Saúde Animal|60;Ginecologia Veterinária|60;Melhoramento Animal|60;Sociologia Rural|60
Viroses dos Animais Domésticos|75;Radiologia Veterinária|30;Bacterioses dos Animais Domésticos|75;Microbiologia dos Alimentos de Origem Animal A|60;Doenças Parasitárias dos Animais Domésticos S|75;Obstetrícia Veterinária|60
Higiene Veterinária e Saúde Pública|60;Ornitopatologia Veterinária|60;Clínica Médica dos Ruminantes|75;Tecnologia de Leite e Produtos Derivados|60;Tecnologia da Carne e Produtos Derivados|60;Clínica Médica de Caninos e Felinos|60
Deontologia e Medicina Legal Veterinária|45;Doenças Carenciais Metabólicas e Intoxicação dos Ruminantes|60;Clínica Médica de Equídeos e Suínos|60;Inspeção de Leite e Produtos Derivados|60;Inspeção de Carne e Produtos Derivados|75;Extensão Rural|75
Estágio Supervisionado Obrigatório|405'''
old=[]
def oldrow(name,hours,period,typ='Obrigatória'):
    old.append(dict(id=f'MVET02-{len(old)+1:03}',code=None,name=name,type=typ,period=period,profile='MVET02',credits=None,workload=dict(teorica=None,pratica=None,extensao=None,total=hours),prerequisites=None,corequisites=None,equivalences=None,ementa=None,evidence=[ev('matrix','matriz',1,f'{name}; {hours} h; período {period}')],sourceClaims={}))
for period,line in enumerate(matrix.splitlines(),1):
    for item in line.split(';'):
        name,h=item.split('|');oldrow(name,int(h),period)
oldrow('Educação Física A',30,None)
old[-1]['evidence']=[ev('workload.total','perfil_acex',18,'Educação Física 30 horas')]
for name,h in [('Ornitologia',60),('Zoologia Básica',60),('Associativismo, Cooperativismo e Economia Solidária',60),('Empreendedorismo e Desenvolvimento Local',45),('Educação das Relações Étnico-Raciais',30),('Língua Brasileira de Sinais (Libras)',60)]:oldrow(name,h,'Optativa','Optativa')

joined=''; offsets=[]
for p in sources['perfil_acex']['pages'][35:140]:
    offsets.append((len(joined),p['page']))
    joined+=re.sub(r'^\d+\s*\n','',p['text'])+'\n'
starts=list(re.finditer(r'PROGRAMA DE DISCIPLINA',joined))
oldprograms=[]
for i,start in enumerate(starts):
    block=joined[start.end():starts[i+1].start() if i+1<len(starts) else len(joined)]
    head=re.search(r'DISCIPLINA:(.*?)DEPARTAMENTO:',block,re.S)
    if not head:continue
    header=head.group(1);cm=re.search(r'CÓDIGO:\s*([A-Z]{3,5}\s*\d{4,5})',header)
    code=re.sub(r'\s+','',cm.group(1)) if cm else None
    name=clean(re.sub(r'CÓDIGO:\s*(?:[A-Z]{3,5}\s*\d{4,5})?', '',header)).replace('Étnico- Raciais','Étnico-Raciais')
    page=max(p for offset,p in offsets if offset<=start.end()+head.start())
    def grab(pattern):
        m=re.search(pattern,clean(block),re.S);return clean(m.group(1)) if m else None
    hours=number(grab(r'CARGA HORÁRIA:\s*(\d+)'))
    theory=number(grab(r'TEÓRICAS:\s*(\d+)'));practice=number(grab(r'PRÁTICAS:\s*(\d+)'))
    oldprograms.append(dict(name=name,code=code,page=page,total=hours,teorica=theory,pratica=practice,credits=number(grab(r'NÚMERO DE CRÉDITOS:\s*(\d+)')),prerequisiteRule=grab(r'PRÉ-REQUISITOS:\s*(.*?)CÓ-REQUISITOS:'),corequisiteRule=grab(r'CÓ-REQUISITOS:\s*(.*?)SEMESTRE/ANO'),ementa=grab(r'\bEMENTA\s*(.*?)\bCONTEÚDOS'),rawHeader=clean(block[:block.find('EMENTA')])) )
aliases={'Anestesiologia':'Anestesiologia Veterinária','Clínica Médica dos Ruminantes':'Clínica Médica de Ruminantes','Tecnologia da Carne e Produtos Derivados':'Tecnologia de Carne e Produtos Derivados','Doenças Carenciais Metabólicas e Intoxicação dos Ruminantes':'Doenças Carenciais, Metabólicas e Intoxicações dos Ruminantes.'}
for s in old:
    target=norm(aliases.get(s['name'],s['name']))
    candidates=[p for p in oldprograms if norm(p['name'])==target]
    if len(candidates)!=1:
        issue(s['id'],'ementa','Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.');continue
    p=candidates[0];s['sourceClaims']['program']=p
    s['code']=p['code'];s['credits']=p['credits'];s['ementa']=p['ementa'];s['prerequisiteRule']=p['prerequisiteRule'];s['corequisiteRule']=p['corequisiteRule']
    s['evidence'].append(ev('program','perfil_acex',p['page'],p['rawHeader']))
    s['evidence'].append(ev('ementa','perfil_acex',p['page'],p['ementa']))
    if norm(p['prerequisiteRule'])=='nenhum':s['prerequisites']=[]
    if norm(p['corequisiteRule'])=='nenhum':s['corequisites']=[]
    if p['total'] is not None and p['total']!=s['workload']['total']:
        s['sourceClaims']['matrixHours']=s['workload']['total']
        issue(s['id'],'workload.total',f'Matriz {s["workload"]["total"]} h; programa {p["total"]} h (p. {p["page"]}). Valor consolidado nulo.')
        s['workload']['total']=None
    if p['teorica'] is not None and p['pratica'] is not None and p['teorica']+p['pratica']==p['total']:
        s['workload'].update(teorica=p['teorica'],pratica=p['pratica'])
    else:
        issue(s['id'],'workload','Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.')

# Identifiers in historical documents are not assumed to be unique or corrected from another profile.
for collection in [old,new]:
    for s in collection:
        if s['code'] and sum(x['code']==s['code'] for x in collection)>1:
            issue(s['id'],'code',f'Código {s["code"]} repetido no documento para disciplinas distintas. Mantido como declarado; ID interno independente.')
        if not s['ementa']:issue(s['id'],'ementa','Ementa não extraída; conferir fonte antes de completar.')

issue('MVET02','totalHours','O documento declara 4.305 h e exige ACEX de 440 h para ingressantes a partir de 2022.2 (p. 144). O quadro de integralização não explica a inclusão dessas horas; não foi criado total de 4.745 h.')
issue('MVET02','subjects','Na p. 33 consta Fundamentos de Economia Rural (60 h) no 3º período; a matriz gráfica e o programa p. 36 identificam Administração e Planejamento Rural (60 h), adotada nesta extração.')
issue('MVET03-MVET0052','prerequisites','A matriz exige componentes obrigatórios e optativos dos períodos 1–8, ACC e ACEX; o programa p. 282 omite optativas. Requer confirmação institucional.')
issue('MVET03-MVET0054','prerequisites','A matriz exige ESO I e Educação Física A; o programa p. 288 também menciona TCC, ACEX e obrigatórias dos períodos 1–8. Requer confirmação institucional.')
issue('MVET03','acexHours','O quadro da p. 65 rotula 400 h como 10% do total de 4.150 h, embora a razão seja aproximadamente 9,64%. Mantidas as horas expressamente declaradas.')
issue('MVET02','acexHours','A p. 144 rotula 440 h como 10% de 4.305 h, embora a razão seja aproximadamente 10,22%. Mantidas as horas expressamente declaradas.')
for s in new:
    for ref in s['prerequisites'] or []:
        target=next((x for x in new if x['id']==ref['id']),None)
        if target:ref['name']=target['name']

def tree(s):
    return dict(id=s['id'],code=s['code'],name=s['name'],period=s['period'] if isinstance(s['period'],int) else None,hours=s['workload']['total'],profile=s['profile'],academicType=s['type'],credits=s['credits'],workload=s['workload'],type='optativa' if s['type']=='Optativa' else 'estagio' if 'Estágio' in s['name'] else 'outros',prereqs=[x['id'] for x in s['prerequisites']] if s['prerequisites'] is not None else None,desc=s['ementa'],evidence=s['evidence'])
profiles=[dict(id='MVET03',name='Medicina Veterinária — MVET03',validFromSemester='2026.1',totalHours=4150,acexHours=400,accHours=60,optativeHours=75,mandatoryHours=2925,minimumSemesters=10,maximumSemesters=17,internshipHours=630,tccHours=30,physicalEducationHours=30,optionalSlots=slots,subjects=[tree(s) for s in new],evidence=[ev('profile','ppc',16,sources['ppc']['pages'][15]['text']),ev('hours','ppc',65,sources['ppc']['pages'][64]['text'])]),
dict(id='MVET02',name='Medicina Veterinária — MVET02',totalHours=4305,acexHours=440,acexAppliesFromSemester='2022.2',acexDeadlinePeriod=8,accHours=120,optativeHours=0,optionalCatalogueHours=315,mandatoryHours=3750,minimumSemesters=11,maximumYears=8,internshipHours=405,physicalEducationHours=30,subjects=[tree(s) for s in old],evidence=[ev('hours','perfil_acex',18,sources['perfil_acex']['pages'][17]['text']),ev('acexHours','perfil_acex',144,sources['perfil_acex']['pages'][143]['text'])])]
manifest=[]
for key,source in sources.items():
    path=Path('C:/Users/alexl/Downloads/ABDM/Documents')/source['file']
    manifest.append(dict(id=key,file=source['file'],path=str(path),pages=len(source['pages']),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
data=dict(export_date='2026-09-19',courseName='Medicina Veterinária',courseShortName='MVET',institution='Universidade Federal do Agreste de Pernambuco — UFAPE',city='Garanhuns',state='PE',degree='Bacharelado',modality='Presencial',shifts=['Matutino','Vespertino'],annualPlaces=80,activeProfileId='MVET03',profiles=profiles,subjects=new+old,sourceManifest=manifest,extraction=dict(issues=issues,sources=[s['file'] for s in manifest],stages=['Leitura dos quatro PDFs fornecidos','Separação por perfil','Extração de tabelas e ementas','Comparação de fontes e validação'],notes=['Nenhum cadastro preexistente foi usado.','Páginas são posições físicas no PDF, iniciando em 1.','PCC não é ACEX e não foi convertido em carga de extensão.','Campos nulos representam ausência, ambiguidade ou conflito; não significam zero.','sourceClaims preserva valores e regras divergentes. IDs sem código oficial são identificadores internos.','As vagas de Optativa I e II não são disciplinas adicionais ao catálogo.','Não foram extraídos horários de aula, docentes ou turmas: os documentos são curriculares.']))
write('curriculo_medicina-veterinaria.json',data)
for p,subjects in zip(profiles,[new,old]):write(p['id']+'.json',dict(courseName=data['courseName'],profile=p,subjects=subjects,sourceManifest=manifest,issues=[i for i in issues if i['record'].startswith(p['id'])]))
write('programas-extraidos.json',dict(MVET03=list(programs.values()),MVET02=oldprograms))
report=['# Extração — Medicina Veterinária / UFAPE','', 'Extração nova, exclusivamente dos quatro PDFs fornecidos e da matriz apresentada na imagem. Nenhum cadastro anterior foi utilizado.','', '| Perfil | Integralização declarada | Duração mínima | ACC | ACEX | Optativas exigidas |','|---|---:|---:|---:|---:|---:|','| MVET03 (2026.1) | 4.150 h | 10 semestres | 60 h | 400 h | 75 h |','| MVET02 | 4.305 h | 11 semestres | 120 h | 440 h, ingressantes desde 2022.2 | 0 h; catálogo de 315 h |','', '## Como interpretar','', 'Os JSONs incluem disciplinas por período, cargas, créditos, ementas, regras de pré-requisitos e equivalências, evidências por página e os valores originais em `sourceClaims`. Os dados consolidados mantêm `null` quando não há confirmação. Não há horários nem professores nestas fontes. As equivalências com “+” devem ser lidas como combinações; o texto original foi preservado.','', 'O campo `mandatoryHours` representa as disciplinas obrigatórias, separado de estágio, TCC, Educação Física, optativas, ACC e ACEX. No MVET03: 2.925 + 630 + 30 + 30 + 75 + 60 + 400 = 4.150 h. No MVET02, o total declarado não esclarece a contabilização das 440 h de ACEX.','', '## Cobertura','']
for p,subjects in zip(profiles,[new,old]):
    report += [f'- {p["id"]}: {len(subjects)} componentes ({sum(s["type"]=="Optativa" for s in subjects)} optativos); {sum(bool(s["ementa"]) for s in subjects)} ementas extraídas.']
report+=['','## Pendências e divergências','']+[f'- **{i["record"]} / {i["field"]}:** {i["message"]}' for i in issues]
report+=['','## Disciplinas por perfil','']
for p,subjects in zip(profiles,[new,old]):
    report += [f'### {p["id"]}','','| Período | Código | Disciplina | CH consolidada |','|---|---|---|---:|']
    report += [f'| {s["period"] if s["period"] is not None else "Flexível"} | {s["code"] or "A confirmar"} | {s["name"]} | {s["workload"]["total"] if s["workload"]["total"] is not None else "Conflito"} |' for s in subjects]
    report+=['']
report+=['## Fontes','']+[f'- `{s["file"]}` — {s["pages"]} páginas. SHA-256: `{s["sha256"]}`.' for s in manifest]
(OUT/'LEIA-ME.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
for profile,subjects in [('MVET03',new),('MVET02',old)]:
    lines=[f'# Ementas — {profile}', '', 'Texto extraído dos PDFs fornecidos. As divergências e os campos originais estão nos JSONs e no LEIA-ME.', '']
    for s in subjects:
        lines += [f'## {s["name"]}', '', f'Código: {s["code"] or "a confirmar"}. Período: {s["period"] if s["period"] is not None else "flexível"}. Carga total: {s["workload"]["total"]} h.', '', s['ementa'] or '*Ementa não localizada no ementário deste perfil.*', '']
        if s.get('prerequisiteRule'):lines += ['Pré-requisito declarado na matriz/programa: '+s['prerequisiteRule'], '']
        if s.get('programPrerequisiteRule'):lines += ['Pré-requisito declarado no programa: '+s['programPrerequisiteRule'], '']
        p=s['sourceClaims'].get('program')
        if p:lines += [f'Fonte do programa: {sources["ppc" if profile=="MVET03" else "perfil_acex"]["file"]}, início na página {p["page"]}.', '']
    (OUT/f'ementas-{profile}.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(dict(new=len(new),old=len(old),new_programs=len(programs),old_programs=len(oldprograms),new_ementas=sum(bool(s['ementa']) for s in new),old_ementas=sum(bool(s['ementa']) for s in old),issues=len(issues)),ensure_ascii=False))
