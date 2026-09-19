# 14 - Matriz de Rastreabilidade

A matriz abaixo estabelece a rastreabilidade ponta a ponta entre os **Requisitos Funcionais (RF)**, as **Telas e Componentes**, as **Regras de Negócio/Algoritmos**, as **Fontes de Dados** e os **Endpoints de Backend/IA**.

---

## Tabela de Rastreabilidade

| Requisito | Tela / View | Componente / Widget | Regra de Negócio / Algoritmo | Fonte de Dados / Storage | Endpoint / API |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF01** (Seleção de Curso) | `HomeView` | `CourseSelectorGrid` | Persistência do curso ativo | `localStorage['selectedCourse']` | N/A |
| **RF02** (Troca de Curso) | `HomeView`, `Navbar` | `NavbarCourseBadge`, Botão Alterar | Limpeza de estado e troca de contexto | `localStorage['selectedCourse']` | N/A |
| **RF03** (Carregar Grade) | `HomeView`, Grade | `HomeView`, `Sidebar` | Carga de disciplinas oficiais | `data/{curso}/horario_{curso}_2026_1.json` | N/A |
| **RF04** (Filtrar e Buscar) | Grade | `Sidebar` (`SearchInput`, `PeriodTabs`) | Normalização NFD sem acentos | `saved_disciplinesList` | N/A |
| **RF05** (Adicionar na Grade)| Grade | `Sidebar` (`DisciplineCard`), `ScheduleGrid` | Inclusão de sessões na matriz semanal | `localStorage['schedule_{curso}']` | N/A |
| **RF06** (Detecção Conflito) | Grade | `Sidebar`, `ScheduleGrid`, Toast | `parseTimeToMinutes`, sobreposição `startA < endB && startB < endA` | `schedule` em memória | N/A |
| **RF07** (Sem Horário) | Grade | `ScheduleGrid` (`UndeterminedSection`) | Filtragem de matérias com `sessions.length === 0` | `schedule` em memória | N/A |
| **RF08** (Concluir Matéria) | Grade, Matriz, Modal | `Sidebar`, `DisciplineDetailsModal` | Remove da grade horária e sincroniza com a matriz | `completedDisciplines`, `bcc_matriz_progress` | N/A |
| **RF09** (Versão da Matriz) | Matriz | `MatrizView` (`VersionToggle`) | Alternância entre matriz Nova e Antiga | `bcc_matrix_version` | N/A |
| **RF10** (Grafo Pré-requisitos)| Matriz | `MatrizView` (`MatrixGraphPainter`) | Cálculo geométrico de curvas Bézier cúbicas SVG | `curriculo_bcc.json`, `Subject.prereqs` | N/A |
| **RF11** (Status na Matriz) | Matriz | `MatrizView` (`SubjectCard`) | Ciclo: Pendente $\rightarrow$ Cursando $\rightarrow$ Concluído | `bcc_matriz_progress` | N/A |
| **RF12** (Lançamento de Nota) | Matriz | `MatrizView` (`GradeInput`) | Validação de número entre 0.0 e 10.0 | `bcc_matriz_progress` | N/A |
| **RF13** (Lançamento ACEX/ACC)| Matriz | `MatrizView` (`AcexAccInputs`) | Teto de 320h para ACEX e 90h para ACC | `bcc_acex_hours`, `bcc_acc_hours` | N/A |
| **RF14** (Progresso Curricular)| Matriz | `MatrizView` (`StatsProgressBar`) | $\min(100, (\text{Horas} / 3200) \times 100)$ | `bcc_matriz_progress`, ACEX, ACC | N/A |
| **RF15** (Reset de Progresso) | Matriz | `MatrizView` (`ResetConfirmDialog`) | Restauração dos arrays iniciais zerados | `bcc_matriz_progress` | N/A |
| **RF16** (Catálogo Disciplinas)| Catálogo | `DisciplinesView` (`CatalogList`) | Filtros combinados de período e obrigatoriedade | `data/{curso}/curriculo_{curso}.json` | N/A |
| **RF17** (Modal de Detalhes) | Modal Global | `DisciplineDetailsModal` | Cruzamento de código normalizado com ementas | `curriculo_bcc.json`, `conteudos_bcc.json` | N/A |
| **RF18** (Exportação Backup) | `HomeView` | `BackupExportButton` | Serialização das 13 chaves em arquivo JSON | `my_ufape_backup.json` | N/A |
| **RF19** (Importação Backup) | `HomeView` | `BackupImportButton` | Deserialização e restauração no storage | `my_ufape_backup.json` | N/A |
| **RF20** (Upload de PDF) | Admin | `AdminView` (`DragDropArea`) | Leitura de arquivo binário para Base64 | Arquivo local do usuário | N/A |
| **RF21** (Extração via IA) | Admin | `AdminView` (`GeminiExtractionFlow`) | Prompt de sistema especializado UFAPE e schema | Documento PDF | `POST /api/extract-pdf` |
| **RF22** (Revisão da Extração)| Admin | `AdminView` (`ReviewTable`) | Edição interativa de turmas, docentes e slots | `extractedDisciplines` | N/A |
| **RF23** (Salvar Curso Custom) | Admin | `AdminView` (`SaveCourseButton`) | Upsert no arquivo de cursos do servidor | `custom_cursos.json` | `POST /api/courses` |
