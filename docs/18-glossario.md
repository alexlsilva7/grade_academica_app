# 18 - Glossário de Termos Acadêmicos e Técnicos

Este glossário define os principais termos e conceitos utilizados no ecossistema acadêmico da **UFAPE** e na engenharia de software do aplicativo **My UFAPE**.

---

## 1. Termos Acadêmicos e Universitários da UFAPE

- **ACEX (Atividades Curriculares de Extensão):** Horas obrigatórias de extensão universitária exigidas pelas diretrizes do MEC e integradas ao currículo dos cursos de graduação. No BCC da UFAPE, correspondem a um teto obrigatório de 320 horas (10% da carga horária total do curso).
- **ACC (Atividades Complementares do Curso):** Atividades extracurriculares voluntárias realizadas pelo discente ao longo da graduação (cursos de capacitação, participação em congressos, monitorias, projetos de pesquisa). No BCC da UFAPE, o aproveitamento máximo é de 90 horas.
- **Carga Horária (CH):** Quantidade de horas-relógio dedicadas a uma atividade acadêmica, dividida formalmente em:
  - *Teórica:* Horas expositivas em sala de aula ou laboratório de informática.
  - *Prática:* Atividades experimentais, práticas de campo ou projetos aplicados.
  - *Extensão:* Atividades voltadas à interação com a comunidade externa.
  - *Total:* Soma de todas as parcelas formativas da disciplina.
- **Co-requisito:** Disciplina que deve ser cursada obrigatoriamente no mesmo semestre (concomitantemente) com outra matéria associada.
- **Crédito Acadêmico:** Unidade de medida do trabalho discente. Na UFAPE, comumente 1 crédito corresponde a 15 horas de atividades acadêmicas semestrais.
- **Disciplina Obrigatória:** Unidade curricular que integra o núcleo estruturante do curso e deve ser cursada impreterivelmente por todos os alunos para obtenção do diploma.
- **Disciplina Optativa / Eletiva:** Disciplina de livre escolha do discente dentro de um rol de áreas de aprofundamento científico e tecnológico oferecidas pelos docentes no semestre.
- **Ementa:** Descrição textual oficial e sintética dos tópicos essenciais e objetivos de aprendizagem fixados no Projeto Pedagógico do Curso (PPC).
- **Equivalência Curricular:** Reconhecimento acadêmico formal de que uma disciplina cursada em um currículo anterior (ou em outro curso de graduação) substitui integralmente a exigência de uma disciplina do currículo atual.
- **Integralização Curricular:** Conclusão formal de 100% da carga horária mínima exigida pelo curso (3.200 horas em BCC), habilitando o discente à colação de grau.
- **Matriz Curricular:** Representação estruturada e encadeada de todas as disciplinas que compõem o curso de graduação, organizadas por períodos letivos e pré-requisitos.
- **PPC (Projeto Pedagógico de Curso):** Documento oficial que rege a estrutura do curso, perfil do egresso, matriz curricular, ementário e normas de integralização.
- **Pré-requisito:** Exigência de aprovação prévia em uma disciplina anterior antes de estar habilitado a se matricular na disciplina subsequente.

---

## 2. Termos Técnicos do Aplicativo My UFAPE

- **Conflito de Horário (Choque):** Situação em que duas ou mais turmas selecionadas pelo aluno possuem aulas alocadas no mesmo dia da semana e com intervalos de tempo que se sobrepõem.
- **Curva Bézier Cúbica:** Equação paramétrica matemática utilizada para traçar linhas de conexão curvas suaves com dois pontos de controle (`cp1` e `cp2`), conectando visualmente as disciplinas aos seus pré-requisitos na matriz curricular sem cortar outros cards.
- **CustomPainter (Flutter):** Mecanismo de renderização de baixo nível do Flutter que fornece uma tela de desenho vetorial (`Canvas`) para traçar linhas, curvas e geometrias complexas com alta performance gráfica.
- **Grafo de Pré-requisitos:** Estrutura de dados em grafo direcionado acíclico (DAG - *Directed Acyclic Graph*), onde os nós representam disciplinas e as arestas direcionadas representam as dependências de pré-requisitos.
- **Persistência Local (Local Storage):** Armazenamento de dados no dispositivo do próprio usuário (navegador web ou storage do dispositivo móvel), sem necessidade de banco de dados remoto ou conta em nuvem.
- **Slug:** Identificador alfanumérico em caixa baixa, sem espaços ou acentos, utilizado como chave primária de busca (ex: `"intro_prog_1"`).
- **TimeSlot:** Intervalo padronizado de tempo para alocação de aulas no sistema acadêmico (ex: `"18:30 - 20:10"`).
