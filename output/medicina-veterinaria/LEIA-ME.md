# Extração — Medicina Veterinária / UFAPE

Extração nova, exclusivamente dos quatro PDFs fornecidos e da matriz apresentada na imagem. Nenhum cadastro anterior foi utilizado.

| Perfil | Integralização declarada | Duração mínima | ACC | ACEX | Optativas exigidas |
|---|---:|---:|---:|---:|---:|
| MVET03 (2026.1) | 4.150 h | 10 semestres | 60 h | 400 h | 75 h |
| MVET02 | 4.305 h | 11 semestres | 120 h | 440 h, ingressantes desde 2022.2 | 0 h; catálogo de 315 h |

## Como interpretar

Os JSONs incluem disciplinas por período, cargas, créditos, ementas, regras de pré-requisitos e equivalências, evidências por página e os valores originais em `sourceClaims`. Os dados consolidados mantêm `null` quando não há confirmação. Não há horários nem professores nestas fontes. As equivalências com “+” devem ser lidas como combinações; o texto original foi preservado.

O campo `mandatoryHours` representa as disciplinas obrigatórias, separado de estágio, TCC, Educação Física, optativas, ACC e ACEX. No MVET03: 2.925 + 630 + 30 + 30 + 75 + 60 + 400 = 4.150 h. No MVET02, o total declarado não esclarece a contabilização das 440 h de ACEX.

## Cobertura

- MVET03: 79 componentes (24 optativos); 79 ementas extraídas.
- MVET02: 66 componentes (6 optativos); 61 ementas extraídas.

## Pendências e divergências

- **MVET03-MVET0018 / workload.teorica:** Matriz informa 45 h; programa informa 30 h (PPC p. 200). Valor consolidado nulo.
- **MVET03-MVET0018 / workload.pratica:** Matriz informa 0 h; programa informa 15 h (PPC p. 200). Valor consolidado nulo.
- **MVET03-MVET0031 / workload.teorica:** Matriz informa 30 h; programa informa 45 h (PPC p. 226). Valor consolidado nulo.
- **MVET03-MVET0031 / workload.pratica:** Matriz informa 15 h; programa informa 0 h (PPC p. 226). Valor consolidado nulo.
- **MVET03-MVET0052 / prerequisites:** Há condições de integralização. Consultar os dois textos em sourceClaims; a lista simples foi deixada nula.
- **MVET03-MVET0053 / prerequisites:** Há condições de integralização. Consultar os dois textos em sourceClaims; a lista simples foi deixada nula.
- **MVET03-MVET0054 / prerequisites:** Há condições de integralização. Consultar os dois textos em sourceClaims; a lista simples foi deixada nula.
- **MVET03-UAG0O232 / code:** Código divergente: matriz UAG0O232; programa UAG00232 (PPC p. 303). Código consolidado nulo.
- **MVET03-UAG0O232 / workload.pratica:** Matriz informa 30 h; programa informa 15 h (PPC p. 303). Valor consolidado nulo.
- **MVET03-LET00018 / workload.teorica:** Matriz informa 45 h; programa informa 30 h (PPC p. 321). Valor consolidado nulo.
- **MVET03-LET00018 / workload.pratica:** Matriz informa 15 h; programa informa 30 h (PPC p. 321). Valor consolidado nulo.
- **MVET02-001 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-006 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-009 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-010 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-011 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-014 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-017 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-019 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-020 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-024 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-026 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-029 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-034 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-040 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-042 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-045 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-049 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-054 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-055 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-059 / ementa:** Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.
- **MVET02-060 / ementa:** Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.
- **MVET02-061 / ementa:** Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.
- **MVET02-062 / ementa:** Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.
- **MVET02-065 / workload:** Distribuição teórica/prática incompleta ou com unidade ambígua no programa; não foi convertida para horas totais.
- **MVET02-066 / ementa:** Programa não identificado no ementário do MVET02; campos ausentes permanecem nulos.
- **MVET02-020 / code:** Código ZOOT3003 repetido no documento para disciplinas distintas. Mantido como declarado; ID interno independente.
- **MVET02-023 / code:** Código ZOOT3003 repetido no documento para disciplinas distintas. Mantido como declarado; ID interno independente.
- **MVET02-059 / ementa:** Ementa não extraída; conferir fonte antes de completar.
- **MVET02-060 / ementa:** Ementa não extraída; conferir fonte antes de completar.
- **MVET02-061 / ementa:** Ementa não extraída; conferir fonte antes de completar.
- **MVET02-062 / ementa:** Ementa não extraída; conferir fonte antes de completar.
- **MVET02-066 / ementa:** Ementa não extraída; conferir fonte antes de completar.
- **MVET02 / totalHours:** O documento declara 4.305 h e exige ACEX de 440 h para ingressantes a partir de 2022.2 (p. 144). O quadro de integralização não explica a inclusão dessas horas; não foi criado total de 4.745 h.
- **MVET02 / subjects:** Na p. 33 consta Fundamentos de Economia Rural (60 h) no 3º período; a matriz gráfica e o programa p. 36 identificam Administração e Planejamento Rural (60 h), adotada nesta extração.
- **MVET03-MVET0052 / prerequisites:** A matriz exige componentes obrigatórios e optativos dos períodos 1–8, ACC e ACEX; o programa p. 282 omite optativas. Requer confirmação institucional.
- **MVET03-MVET0054 / prerequisites:** A matriz exige ESO I e Educação Física A; o programa p. 288 também menciona TCC, ACEX e obrigatórias dos períodos 1–8. Requer confirmação institucional.
- **MVET03 / acexHours:** O quadro da p. 65 rotula 400 h como 10% do total de 4.150 h, embora a razão seja aproximadamente 9,64%. Mantidas as horas expressamente declaradas.
- **MVET02 / acexHours:** A p. 144 rotula 440 h como 10% de 4.305 h, embora a razão seja aproximadamente 10,22%. Mantidas as horas expressamente declaradas.

## Disciplinas por perfil

### MVET03

| Período | Código | Disciplina | CH consolidada |
|---|---|---|---:|
| 1 | MVET0001 | Anatomia Descritiva dos Animais Domésticos | 105 |
| 1 | MVET0002 | Genética | 60 |
| 1 | MVET0003 | Bioquímica e Biofísica Veterinária | 75 |
| 1 | MVET0004 | Química Veterinária | 45 |
| 1 | MVET0005 | Introdução à Medicina Veterinária | 30 |
| 1 | MVET0006 | Sociologia Rural | 30 |
| 1 | MVET0007 | Economia | 30 |
| 2 | MVET0008 | Anatomia Topográfica dos Animais Domésticos | 105 |
| 2 | MVET0009 | Microbiologia Básica | 60 |
| 2 | MVET0010 | Ética e Deontologia Veterinária | 30 |
| 2 | MVET0011 | Fundamentos de Ecologia | 60 |
| 2 | MVET0012 | Bioestatística Computacional e Bioinformática | 45 |
| 2 | MVET0013 | Extensão Rural | 45 |
| 3 | MVET0014 | Fisiologia Veterinária Básica | 60 |
| 3 | MVET0015 | Parasitologia Veterinária | 60 |
| 3 | MVET0016 | Imunologia Veterinária | 45 |
| 3 | MVET0017 | Histologia e Embriologia Veterinária | 75 |
| 3 | MVET0018 | Bioestatística Experimental | 45 |
| 3 | MVET0019 | Forragicultura | 45 |
| 3 | MVET0020 | Administração Rural | 45 |
| 4 | MVET0021 | Fisiologia Veterinária Especial | 60 |
| 4 | MVET0022 | Farmacologia Veterinária | 60 |
| 4 | MVET0023 | Patologia Clínica Veterinária | 75 |
| 4 | MVET0024 | Diagnóstico por Imagem em Medicina Veterinária | 60 |
| 4 | MVET0025 | Nutrição Animal | 60 |
| 4 | MVET0026 | Microbiologia dos Alimentos de Origem Animal | 60 |
| 5 | MVET0027 | Patologia Geral e Técnica de Necrópsia dos Animais Domésticos | 75 |
| 5 | MVET0028 | Epidemiologia Veterinária | 45 |
| 5 | MVET0029 | Semiologia Veterinária de Pequenos Animais | 45 |
| 5 | MVET0030 | Semiologia Veterinária de Ruminantes e Equídeos | 45 |
| 5 | MVET0031 | Bovinocultura | 45 |
| 5 | MVET0032 | Tecnologia dos Alimentos de Origem Animal | 75 |
| 5 | MVET0045 | Melhoramento Genético Animal | 45 |
| 6 | MVET0033 | Patologia Especial dos Animais Domésticos | 90 |
| 6 | MVET0034 | Higiene Veterinária e Saúde Pública | 45 |
| 6 | MVET0035 | Anestesiologia Veterinária | 60 |
| 6 | MVET0036 | Terapêutica Veterinária | 60 |
| 6 | MVET0037 | Avicultura | 60 |
| 6 | MVET0038 | Técnica Cirúrgica Veterinária | 60 |
| 7 | MVET0039 | Doenças Infecciosas dos Mamíferos Domésticos | 90 |
| 7 | MVET0040 | Doenças Parasitárias dos Animais Domésticos | 45 |
| 7 | MVET0041 | Clínica Médica de Caninos e Felinos | 60 |
| 7 | MVET0042 | Clínica Médica dos Ruminantes | 75 |
| 7 | MVET0043 | Clínica Médica de Equídeos | 45 |
| 7 | MVET0044 | Andrologia e Biotecnologia da Reprodução | 60 |
| 8 | MVET0046 | Ginecologia e Obstetrícia Veterinária | 60 |
| 8 | MVET0047 | Doenças Carenciais e Metabólica dos Ruminantes | 45 |
| 8 | MVET0048 | Clínica Cirúrgica Veterinária de Pequenos Animais | 60 |
| 8 | MVET0049 | Clínica Cirúrgica Veterinária de Ruminantes e Equídeos | 30 |
| 8 | MVET0050 | Sanidade Avícola | 45 |
| 8 | MVET0051 | Inspeção dos Alimentos de Origem Animal | 90 |
| 9 | MVET0052 | Estágio Supervisionado Obrigatório I – ESO I | 300 |
| 9 | MVET0053 | Trabalho de Conclusão de Curso - TCC | 30 |
| 10 | MVET0054 | Estágio Supervisionado Obrigatório II – ESO II | 330 |
| Optativa | MVET0055 | Biologia Molecular Aplicada à Medicina Veterinária | 45 |
| Optativa | MVET0056 | Biossegurança e Gestão de Resíduos | 30 |
| Optativa | MVET0057 | Bioterismo | 45 |
| Optativa | MVET0058 | Caprinocultura e Ovinocultura | 45 |
| Optativa | MVET0059 | Clínica Médica de Animais Silvestres e Exóticos | 45 |
| Optativa | MVET0060 | Comportamento e Bem-Estar Animal | 45 |
| Optativa | MVET0061 | Dor e Analgesia em Medicina Veterinária | 45 |
| Optativa | A confirmar | Educação das Relações Étnico-Raciais I | 60 |
| Optativa | EAL00064 | Empreendedorismo | 45 |
| Optativa | MVET0062 | Equideocultura | 45 |
| Optativa | FISL3001 | Filosofia da Ciência e Ética | 45 |
| Optativa | ECON3002 | Fundamentos de Economia Rural | 45 |
| Optativa | MVET0063 | Gestão Ambiental Aplicada à Medicina Veterinária | 30 |
| Optativa | MVET0064 | Gestão de Qualidade em Alimentos | 45 |
| Optativa | MVET0065 | Introdução à Extensão Universitária | 30 |
| Optativa | MVET0066 | Introdução à Inteligência Artificial Aplicada à Medicina Veterinária | 45 |
| Optativa | LET00018 | LIBRAS | 60 |
| Optativa | MVET0067 | Medicina Veterinária Legal | 30 |
| Optativa | MVET0068 | Metodologia Científica | 30 |
| Optativa | ZOOT3034 | Ornitologia | 60 |
| Optativa | MVET0069 | Plantas Tóxicas para Ruminantes | 45 |
| Optativa | MVET0070 | Suinocultura | 45 |
| Optativa | MVET0071 | Toxicologia Veterinária | 45 |
| Optativa | MVET0072 | Zoologia Aplicada à Medicina Veterinária | 45 |
| Flexível | EDUF3001 | Educação Física A | 30 |

### MVET02

| Período | Código | Disciplina | CH consolidada |
|---|---|---|---:|
| 1 | MORF3003 | Anatomia Descritiva dos Animais Domésticos I | 120 |
| 1 | PRBE3001 | Bioestatística Básica | 45 |
| 1 | QUIM3002 | Química Biológica I | 60 |
| 1 | QUIM3003 | Análise Química Veterinária | 45 |
| 1 | FISL3001 | Filosofia da Ciência e Ética | 45 |
| 1 | ECON3001 | Introdução à Economia | 60 |
| 2 | MORF3004 | Anatomia Topográfica dos Animais Domésticos | 120 |
| 2 | PRBE3002 | Bioestatística Experimental | 60 |
| 2 | BIOQ3002 | Bioquímica IV | 90 |
| 2 | BIOF3001 | Biofísica | 60 |
| 2 | ECON3002 | Fundamentos de Economia Rural | 45 |
| 3 | FISL3003 | Fisiologia Veterinária Básica | 60 |
| 3 | PARS3001 | Parasitologia Veterinária | 60 |
| 3 | MICR3001 | Microbiologia Geral | 75 |
| 3 | MORF3005 | Histologia e Embriologia Veterinária I | 60 |
| 3 | ZOOT3007 | Agrostologia | 60 |
| 3 | RURL3001 | Administração e Planejamento Rural | 60 |
| 4 | FISL3004 | Fisiologia Especial dos Animais Domésticos | 75 |
| 4 | IMUN3001 | Imunologia Veterinária | 45 |
| 4 | ZOOT3003 | Nutrição Animal | 60 |
| 4 | MORF3006 | Histologia e Embriologia Veterinária II | 60 |
| 4 | GENT3001 | Genética Básica e Biotecnologia | 75 |
| 4 | ZOOT3003 | Zootecnia Geral S | 60 |
| 5 | VETR3022 | Patologia Geral e Técnica de Necropsia dos Animais Domésticos | 90 |
| 5 | VETR3007 | Patologia Clínica Veterinária S | 75 |
| 5 | VETR3001 | Semiologia Veterinária | 60 |
| 5 | VETR3002 | Anestesiologia | 30 |
| 5 | ZOOT3004 | Zootecnia Especial I | 60 |
| 5 | FAMC3001 | Farmacologia | 60 |
| 6 | VETR3021 | Patologia Especial dos Animais Domésticos | 105 |
| 6 | VETR3009 | Técnica Cirúrgica Veterinária S | 75 |
| 6 | ECOL3001 | Ecologia Básica e Conservacionismo | 60 |
| 6 | VETR3010 | Terapêutica Veterinária | 75 |
| 6 | ZOOT3005 | Zootecnia Especial II | 60 |
| 7 | VETR3024 | Andrologia e Biotecnologia da Reprodução | 60 |
| 7 | VETR3003 | Clínica Cirúrgica Veterinária S | 75 |
| 7 | VETR3015 | Epidemiologia e Planejamento em Saúde Animal | 60 |
| 7 | VETR3025 | Ginecologia Veterinária | 60 |
| 7 | ZOOT3002 | Melhoramento Animal | 60 |
| 7 | SOCL3001 | Sociologia Rural | 60 |
| 8 | VETR3018 | Viroses dos Animais Domésticos | 75 |
| 8 | VETR3008 | Radiologia Veterinária | 30 |
| 8 | VETR3013 | Bacterioses dos Animais Domésticos | 75 |
| 8 | ALIM3003 | Microbiologia dos Alimentos de Origem Animal A | 60 |
| 8 | VETR3014 | Doenças Parasitárias dos Animais Domésticos S | 75 |
| 8 | VETR3023 | Obstetrícia Veterinária | 60 |
| 9 | VETR3012 | Higiene Veterinária e Saúde Pública | 60 |
| 9 | VETR3020 | Ornitopatologia Veterinária | 60 |
| 9 | VETR3006 | Clínica Médica dos Ruminantes | 75 |
| 9 | ALIM3002 | Tecnologia de Leite e Produtos Derivados | 60 |
| 9 | ALIM3001 | Tecnologia da Carne e Produtos Derivados | 60 |
| 9 | VETR3004 | Clínica Médica de Caninos e Felinos | 60 |
| 10 | VETR3019 | Deontologia e Medicina Legal Veterinária | 45 |
| 10 | VETR3011 | Doenças Carenciais Metabólicas e Intoxicação dos Ruminantes | 60 |
| 10 | VETR3005 | Clínica Médica de Equídeos e Suínos | 60 |
| 10 | VETR3017 | Inspeção de Leite e Produtos Derivados | 60 |
| 10 | VETR3016 | Inspeção de Carne e Produtos Derivados | 75 |
| 10 | AGRO3001 | Extensão Rural | 75 |
| 11 | A confirmar | Estágio Supervisionado Obrigatório | 405 |
| Flexível | A confirmar | Educação Física A | 30 |
| Optativa | A confirmar | Ornitologia | 60 |
| Optativa | A confirmar | Zoologia Básica | 60 |
| Optativa | A confirmar | Associativismo, Cooperativismo e Economia Solidária | 60 |
| Optativa | A confirmar | Empreendedorismo e Desenvolvimento Local | 45 |
| Optativa | A confirmar | Educação das Relações Étnico-Raciais | 30 |
| Optativa | A confirmar | Língua Brasileira de Sinais (Libras) | 60 |

## Fontes

- `PPC DO CURSO DE MEDICINA VETERINÁRIA UFAPE APROVADO PELO CONSEPE - SEMESTRE 2026.1.pdf` — 337 páginas. SHA-256: `0b69abe8c90247cd4a3a7d716db73d4b9f1562bfa33eb14708bacdc7f54d0514`.
- `PPC DO CURSO DE MEDICINA VETERINÁRIA APROVADO - 2026.1 - Pré-requisitos.pdf` — 15 páginas. SHA-256: `0343f22404b3f9986c8403e90a3e78ee45da633d12fce091548eb99adb21eb2a`.
- `Matriz curricular MVET02.pdf` — 1 páginas. SHA-256: `58ebc8ce0af733a40fc9040bdb64cf2d1952bff4d9500755d37dc78af0f9e449`.
- `PERFIL DO  PPC - MVET02 COM INCLUSÃO DE ACEX 440 HORAS - 2026.pdf` — 187 páginas. SHA-256: `2690707c48ab2243b96983fe2f9dc62241a7cc70523277b8ed7e48cd715b0d3f`.
