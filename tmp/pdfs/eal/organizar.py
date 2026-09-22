import json, re, shutil
from pathlib import Path
import unicodedata
from difflib import get_close_matches

base = Path(__file__).parent
out = Path('output/engenharia-de-alimentos')
out.mkdir(parents=True, exist_ok=True)
pages = json.loads((base/'ppc.json').read_text(encoding='utf-8'))
rows = json.loads((base/'rows.json').read_text(encoding='utf-8'))
subjects, optatives, subtotals = [], [], []
period = 1
for row in rows:
    c = row['cells'][:]
    if c and c[0] == 'Subtotal' and period <= 10:
        subtotals.append({'periodo': period, 'valores_originais': c[1:], 'pagina': row['page']})
        period += 1
        continue
    if c and c[0] == '10' and len(c) > 2:
        c = ['Estágio Supervisionado Obrigatório – Engenharia de Alimentos', '-', '300', '', '300', '-']
    if c and c[0] == 'Tecnologia de Leite e Derivados' and len(c) == 5:
        c.insert(3, '')
    if len(c) != 6 or not c[4].isdigit() or not all(v.isdigit() or v in ('-', '') for v in c[1:4]):
        continue
    if 'TCC II' in c[0]:
        c[5] = 'Trabalho de Conclusão de Curso – Engenharia de Alimentos I (TCC I)'
    item = {'nome': c[0], 'codigo': None, 'periodo': period if period <= 10 else None,
            'tipo': 'vaga_optativa' if c[0].startswith('Optativa ') else ('optativa' if period > 10 else 'obrigatoria'),
            'carga_horaria': dict(zip(['teorica','pratica','semipresencial_ead','total'], [int(v) if v.isdigit() else (0 if v == '-' else None) for v in c[1:5]])),
            'pre_requisitos_texto': c[5], 'pagina_fonte': row['page']}
    (subjects if period <= 10 else optatives).append(item)

issues = [
    'A matriz estruturada segue o Quadro 5 (p. 43-48). A Figura 1 (p. 54) troca Optativa IV e V: o quadro coloca IV no 7º e V no 8º; a figura coloca V no 7º e IV no 8º.',
    'Inglês Instrumental I tem a própria disciplina como pré-requisito no Quadro 5 (p. 44). O texto foi preservado; esse vínculo exige confirmação antes de uso em um grafo.',
    'Mecânica dos Materiais (Quadro 5) aparece como Mecânica e Resistência dos Materiais na figura; Introdução à Administração de Empresas aparece abreviada como Introdução a Administração.',
    'Há variantes nos nomes dos pré-requisitos (por exemplo Física III e Higiene e Legislação De Alimentos); foram preservadas, sem criar códigos ou vínculos por suposição.',
    'O subtotal do 4º período impresso no Quadro 5 é 360/15/30/450 (teórica/prática/EAD/total); as linhas somam 360/75/15/450.',
    'O subtotal do 6º período impresso no Quadro 5 é 360/105/15/465; as linhas somam 345/105/15/465.',
    'Células EAD em branco em Tecnologia de Leite e Derivados e Estágio foram mantidas como null. Traços nas cargas horárias foram representados como zero.',
    'Os códigos estão vazios na matriz atual; códigos da matriz antiga no quadro de equivalências não foram atribuídos à matriz nova.',
    'As fichas de ementas também podem divergir do quadro: Sociologia Geral consta no 1º período na matriz, mas sua ficha na p. 67 indica 4º. Esta extração preserva o quadro como referência de períodos.',
    'Texto integral extraído automaticamente, com marcação de páginas; a ordem de leitura e as quebras de tabelas do PDF podem não ser preservadas. Consulte o PDF para layout, fórmulas e elementos gráficos.'
]
totals = [sum(s['carga_horaria']['total'] for s in subjects if s['periodo']==p) for p in range(1,11)]
assert totals == [390,450,405,450,480,465,465,450,330,330], totals
assert sum(totals) == 4215
assert len(optatives) == 43, len(optatives)
assert sum(s['carga_horaria']['total'] for s in subjects if s['tipo']=='vaga_optativa') == 225
data = {'curso':'Bacharelado em Engenharia de Alimentos','ppc':'2018, versão 01/2025',
        'fonte':'PPC CEAL 2018 - 01-2025 - Retififcado.pdf', 'paginas_pdf':284,
        'cargas_horarias':{'disciplinas_obrigatorias':3630,'optativas':225,'estagio':300,'tcc':60,'atividades_complementares':225,'total':4440},
        'periodos':10,'matriz':subjects,'elenco_optativas':optatives,'subtotais_originais':subtotals,'observacoes':issues}
(out/'matriz_curricular.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
shutil.copyfile(base/'ppc.txt', out/'ppc_completo.txt')
md = ['# Engenharia de Alimentos — PPC 2018, versão 01/2025', '',
      'Fonte: PPC CEAL 2018 - 01-2025 - Retififcado.pdf (284 páginas). Matriz: Quadro 5, páginas 43-48; optativas: Quadro 6, páginas 48-51; totais: Quadro 8, página 53; figura: páginas 54-55.', '',
      'Carga total: **4.440 h** = 3.630 h de disciplinas obrigatórias + 225 h de optativas + 300 h de estágio + 60 h de TCC + 225 h de atividades complementares. A matriz sem as atividades complementares soma **4.215 h**. ENADE é componente curricular obrigatório segundo o documento.', '',
      'T = teórica; P = prática; EAD = semipresencial/EAD. “Não informado” representa célula vazia na fonte. Os períodos seguem o Quadro 5.', '']
def table(items):
    lines = ['| Componente curricular | T (h) | P (h) | EAD (h) | Total (h) | Pré-requisitos conforme o quadro | Página |','|---|---:|---:|---:|---:|---|---:|']
    for s in items:
        w = s['carga_horaria']
        values = [s['nome']] + [str(w[k]) if w[k] is not None else 'Não informado' for k in ['teorica','pratica','semipresencial_ead','total']] + [s['pre_requisitos_texto'],str(s['pagina_fonte'])]
        lines.append('| '+' | '.join(values)+' |')
    return lines
for p,total in enumerate(totals,1):
    md += [f'## {p}º período — {total} h',''] + table([s for s in subjects if s['periodo']==p]) + ['']
md += ['## Elenco de optativas','', 'São 43 opções no Quadro 6. A exigência de integralização é de 225 h; as cinco vagas de 45 h da matriz não são disciplinas adicionais ao elenco.', ''] + table(optatives) + ['','## Divergências e critérios de extração',''] + ['- '+i for i in issues]
(out/'matriz_curricular.md').write_text('\n'.join(md)+'\n',encoding='utf-8')

# Arquivo consumido pelo site. O Quadro 5 é a fonte principal da matriz; as
# optativas do Quadro 6 entram no catálogo, mas não como nós extras do fluxo.
def slug(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '_', value).strip('_')

def normalized_name(value):
    return slug(re.sub(r'\s+\d+\s*$', '', value.replace('\n', ' ').strip()))

# Fichas dos componentes curriculares: a seção começa após a matriz e segue o
# padrão COMPONENTE CURRICULAR / EMENTA / BIBLIOGRAFIA BÁSICA.
profile_text = '\n'.join(pages[60:])
sheet_pattern = re.compile(
    r'COMPONENTE CURRICULAR:\s*(.*?)\s*C[ÓO]DIGO:.*?EMENTA:\s*(.*?)\s*BIBLIOGRAFIA B[ÁA]SICA:',
    re.S | re.I
)
ementas = {}
for sheet_name, sheet_summary in sheet_pattern.findall(profile_text):
    clean_name = re.split(r'\s+PER[ÍI]ODO A SER OFERTADO:', sheet_name, maxsplit=1, flags=re.I)[0]
    clean_summary = re.sub(r'\s+', ' ', sheet_summary).strip()
    ementas[normalized_name(clean_name)] = clean_summary
ementa_aliases = {
    'tecnologia_de_conservacao_de_alimentos': 'tecnologias_de_conservacao_de_alimentos',
    'sistema_de_refrigeracao': 'sistemas_de_refrigeracao',
}
def find_ementa(name):
    key = normalized_name(name)
    direct = ementas.get(key) or ementas.get(ementa_aliases.get(key, ''))
    if direct: return direct
    close = get_close_matches(key, ementas.keys(), n=1, cutoff=0.9)
    return ementas.get(close[0]) if close else None

basic = {
    'Pré-Cálculo', 'Introdução à Programação I', 'Química Geral', 'Desenho Técnico',
    'Fundamentos da Biologia Celular', 'Sociologia Geral', 'Português Instrumental',
    'Cálculo I', 'Geometria Analítica e Álgebra Linear', 'Física Geral I',
    'Química Orgânica I', 'Metodologia Científica', 'Introdução à Economia',
    'Inglês Instrumental I', 'Cálculo II', 'Estatística Básica', 'Física Geral II',
    'Química Orgânica II', 'Cálculo III', 'Meio Ambiente e Sustentabilidade',
    'Física Geral III', 'Bioquímica Geral', 'Microbiologia Geral', 'Cálculo IV'
}
specific = {
    'Introdução à Engenharia de Alimentos', 'Matérias-Primas de Origem Animal',
    'Matérias-primas de Origem Vegetal', 'Projeto Interdisciplinar I',
    'Bioquímica de Alimentos', 'Microbiologia de Alimentos',
    'Nutrição e Qualidade Nutricional de alimentos', 'Análise de Alimentos',
    'Química de Alimentos I', 'Tecnologia de Conservação de Alimentos',
    'Projeto Interdisciplinar II', 'Análise Sensorial',
    'Higiene e Legislação na Industria de Alimentos', 'Tecnologia de Carnes e Derivados',
    'Tecnologia de Leite e Derivados', 'Embalagem de Alimentos',
    'Tecnologia de Bebidas', 'Tecnologia de Cereais, Raízes e Tubérculos',
    'Tecnologia de Pescado e Derivados', 'Tecnologia de Frutas, Hortaliças e Derivados',
    'Controle de Qualidade na Industria de Alimentos', 'Engenharia de Segurança',
    'Projeto Interdisciplinar III'
}
ids = {s['nome']: f"eal_p{s['periodo']}_{slug(s['nome'])}" for s in subjects}
aliases = {
    'Física III': 'Física Geral III',
    'Higiene e Legislação De Alimentos': 'Higiene e Legislação na Industria de Alimentos',
    'Tecnologias de Conservação de Alimentos': 'Tecnologia de Conservação de Alimentos',
    'Tecnologias de Conservação de Alimentos, Química de Alimentos I': 'Tecnologia de Conservação de Alimentos; Química de Alimentos I',
}
def split_prereqs(text):
    if not text or text == '-': return []
    text = aliases.get(text, text)
    # Vírgulas separam componentes no Quadro 5; o nome das disciplinas não usa vírgula.
    return [p.strip() for p in re.split(r';|,|\be\b(?= Cálculo II$)', text) if p.strip()]
def category(s):
    if s['tipo'] == 'vaga_optativa': return 'optativa'
    if s['nome'].startswith('Estágio Supervisionado'): return 'estagio'
    if 'Trabalho de Conclusão' in s['nome']: return 'outros'
    if s['nome'] in basic: return 'basico'
    if s['nome'] in specific: return 'especifica'
    return 'profissionalizante'

# Códigos declarados para o Perfil EAL02 no Quadro 9 e no Quadro 10 do PPC
# EAL03 (p. 58-60). Os demais componentes não recebem, por inferência, códigos
# do Perfil EAL03: os dois perfis usam códigos diferentes.
eal02_codes = {
    'Cálculo I': 'MATM3030', 'Cálculo II': 'MATM3006',
    'Cálculo III': 'MATM3007', 'Cálculo IV': 'UAG00111',
    'Desenho Técnico': 'DPRJ3001', 'Embalagem de Alimentos': 'UAG00160',
    'Empreendedorismo': 'UAG00112',
    'Fenômenos de Transporte I': 'UAG00113',
    'Fenômenos de Transporte II': 'UAG00116',
    # A fonte declara FISC3007 para Física Geral I E e III E; preservado como publicado.
    'Física Geral I': 'FISC3007', 'Física Geral III': 'FISC3007',
    'Físico-Química': 'UAG00109',
    'Fundamentos da Biologia Celular': 'BIOL3001',
    'Geometria Analítica e Álgebra Linear': 'UAG00101',
    'Instrumentação e Controle': 'ELET3002',
    'Introdução à Engenharia de Alimentos': 'UAG00157',
    'Metodologia Científica': 'CIEN3001', 'Microbiologia Geral': 'UAG00163',
    'Nutrição e Qualidade Nutricional de alimentos': 'ALIM3006',
    'Operações Unitárias I': 'AGRI3014', 'Operações Unitárias II': 'AGRI3015',
    'Química Geral': 'QUIM3004', 'Química Orgânica I': 'QUIM3020',
    'Tecnologia de Bebidas': 'UAG00124',
    'Tecnologia de Carnes e Derivados': 'UAG00120',
    'Tecnologia de Cereais, Raízes e Tubérculos': 'UAG00125',
    'Tecnologia de Conservação de Alimentos': 'UAG00159',
    'Termodinâmica I': 'FISC3008',
    'Trabalho de Conclusão de Curso – Engenharia de Alimentos I (TCC I)': 'UAG00133',
    'Açúcar e Álcool': 'ALIM3033', 'Alimentos Funcionais': 'UAG00135',
    'Associativismo, Cooperativismo e Economia Solidária': 'ADTM3014',
    'Desidratação e Secagem de Alimentos': 'ALIM3030',
    'Rotulagem de Alimentos': 'UAG00148', 'Toxicologia de Alimentos': 'ALIM3007',
}
def prereq_objects(s):
    return [{'code': None, 'name': p} for p in split_prereqs(s['pre_requisitos_texto'])]
def prereq_ids(s):
    result = []
    for name in split_prereqs(s['pre_requisitos_texto']):
        canonical = aliases.get(name, name)
        target = ids.get(canonical)
        # O PPC traz Inglês Instrumental I como pré-requisito de si próprio.
        # O texto fica no catálogo, mas não criamos um laço inválido no fluxograma.
        if target and target != ids[s['nome']]: result.append(target)
    return result

catalog = []
tree = []
for s in subjects:
    w = s['carga_horaria']
    catalog.append({
        'id': ids[s['nome']], 'code': None, 'name': s['nome'],
        'type': 'Optativa' if s['tipo'] == 'vaga_optativa' else 'Obrigatória',
        'period': str(s['periodo']), 'profile': 'EAL2018',
        'credits': w['total'] // 15, 'workload': {
            'teorica': w['teorica'], 'pratica': w['pratica'], 'extensao': 0,
            'semipresencialEad': w['semipresencial_ead'], 'total': w['total']},
        'prerequisites': prereq_objects(s), 'corequisites': [], 'equivalences': [],
        'ementa': find_ementa(s['nome']), 'sourcePage': s['pagina_fonte']})
    tree.append({
        'id': ids[s['nome']], 'code': None, 'name': s['nome'], 'period': s['periodo'],
        'hours': w['total'], 'profile': 'EAL2018', 'academicType': catalog[-1]['type'],
        'credits': w['total'] // 15, 'workload': catalog[-1]['workload'],
        'type': category(s), 'prereqs': prereq_ids(s),
        'desc': f"Carga horária: {w['total']}h. Pré-requisitos conforme o PPC: {s['pre_requisitos_texto']}."})
for s in optatives:
    w = s['carga_horaria']
    catalog.append({
        'id': 'eal_opt_' + slug(s['nome']), 'code': None, 'name': s['nome'],
        'type': 'Optativa', 'period': 'Optativa', 'profile': 'EAL2018',
        'credits': w['total'] // 15, 'workload': {
            'teorica': w['teorica'], 'pratica': w['pratica'], 'extensao': 0,
            'semipresencialEad': w['semipresencial_ead'], 'total': w['total']},
        'prerequisites': prereq_objects(s), 'corequisites': [], 'equivalences': [],
        'ementa': find_ementa(s['nome']), 'sourcePage': s['pagina_fonte']})

site_data = {
    'export_date': '2026-09-19T00:00:00.000Z',
    'courseName': 'Engenharia de Alimentos', 'courseShortName': 'EAL',
    'activeProfileId': 'EAL2018', 'subjects': catalog, 'treeSubjects': tree,
    'profiles': [{
        'id': 'EAL2018', 'name': 'PPC 2018 — versão 01/2025',
        'description': 'Matriz retificada em janeiro de 2025, conforme o Quadro 5 do PPC.',
        'validFromSemester': '2019.1', 'totalHours': 4440, 'acexHours': 0,
        'accHours': 225, 'optativeHours': 225, 'mandatoryHours': 3630,
        'subjects': tree
    }],
    'source': {'document': 'PPC CEAL 2018 - 01-2025 - Retififcado.pdf',
               'matrixPages': '43-48', 'electivePages': '48-51', 'summaryPage': 53,
               'notes': issues},
    'extractionSummary': {
        'matrixSubjects': len(subjects), 'electiveOptions': len(optatives),
        'catalogEntries': len(catalog),
        'entriesWithEmenta': sum(1 for item in catalog if item['ementa'])
    }
}
Path('src/data/eal/curriculo_eal.json').write_text(json.dumps(site_data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'componentes_matriz':len(subjects),'optativas':len(optatives),'totais_periodos':totals,'total_com_acc':sum(totals)+225,'caracteres_texto':sum(map(len,pages))},ensure_ascii=False))
