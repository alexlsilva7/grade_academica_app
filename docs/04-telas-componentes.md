# 04 - Especificação de Telas e Componentes

Este documento descreve detalhadamente cada tela, componente e modal do sistema **My UFAPE**, detalhando objetivos, propriedades (props), estados internos, eventos disparados e a contraparte correspondente recomendada para a implementação em **Flutter**.

---

## 1. Mapa de Telas e Hierarquia

```
App (Root Coordinator / Shell)
├── Navbar (Cabeçalho comum com título, curso e tema)
├── HomeView (Tela de seleção de curso e hub principal)
├── Horário Letivo / Schedule (Tela mista responsiva)
│   ├── Sidebar (Listagem lateral de disciplinas e períodos)
│   ├── ScheduleGrid (Tabela semanal de horários)
│   └── MobileNav (Barra de navegação inferior mobile)
├── MatrizView (Matriz curricular interativa de BCC com grafo)
│   └── Overlay SVG / CustomPainter (Setas Bézier de conexões)
├── DisciplinesView (Catálogo de disciplinas e ementas)
├── DisciplineDetailsModal (Modal detalhado da matéria)
└── AdminView (Painel de extração de PDF com Gemini e CRUD)
```

---

## 2. Especificação Detalhada dos Componentes

### 2.1. HomeView
- **Objetivo:** Ponto de entrada da aplicação para seleção de curso, atalhos de navegação, backup e configuração de tema.
- **Props Recebidas (React):**
  - `loadPredefinedGrade(type: 'bcc' | 'eal' | 'adm')`: Carrega a grade oficial do curso.
  - `setView(view)`: Altera a view ativa.
  - `themePreference`, `cycleTheme()`, `darkMode`: Gestão de tema visual.
  - `selectedCourse`, `changeCourse(course)`: Get e set do curso ativo.
- **Estados Internos:**
  - `fileInputRef`: Referência ao elemento input invisível para upload de arquivo JSON de backup.
- **Seções da Interface:**
  1. *Header superior direito:* Botão de Exportar Backup, Botão de Importar Backup, Botão de Ciclo de Tema (Ícones: Monitor / Sol / Lua).
  2. *Hero Section:* Logotipo da UFAPE (azul para dark mode, padrão para light mode), Título "My UFAPE" e subtítulo institucional.
  3. *Seletor de Cursos (quando nenhum curso está ativo):* Grid com botões para Administração, Ciência da Computação, Engenharia de Alimentos e botões desabilitados com "Em breve".
  4. *Hub de Navegação (quando curso está ativo):*
     - Card "Horário Letivo" (Ícone `CalendarDays`, dispara montagem de grade);
     - Card "Disciplinas" (Ícone `BookOpen`, abre catálogo);
     - Card "Matriz Curricular" (Ícone `Layers`, disponível para BCC);
     - Card tracejado "Painel do Administrador" (exibido apenas fora de produção).
- **Equivalente Flutter:** `HomeScreen` (StatefulWidget com `Scaffold`, `CustomScrollView`, `SliverAppBar` e `Card` widgets animados).

---

### 2.2. Navbar
- **Objetivo:** Cabeçalho persistente em todas as telas secundárias, provendo navegação de volta, identificação da página, curso ativo e controle de tema.
- **Props Recebidas:**
  - `setView(view)`: Ação de voltar para a `home` ou navegar.
  - `title`: Título da tela ("Grade Horária", "Matriz Curricular", "Catálogo de Disciplinas").
  - `course`: Sigla do curso ativo.
  - `darkMode`, `themePreference`, `cycleTheme()`: Controles de tema.
  - `showAcademicPeriod` (booleano opcional): Indica se deve exibir o badge do período vigente (ex.: "2026.1").
- **Ações e Eventos:**
  - Clique no botão de seta voltar (`ArrowLeft`) retorna para a Home.
  - Clique no logotipo ou nome My UFAPE retorna para a Home.
- **Equivalente Flutter:** `AppBar` customizado ou `SliverAppBar`.

---

### 2.3. Sidebar (Painel Lateral da Grade Horária)
- **Objetivo:** Listar disciplinas do período selecionado, permitir busca, adicionar matérias à grade semanal e marcar disciplinas concluídas.
- **Props Recebidas:**
  - `periods: number[]`: Lista de períodos existentes nas disciplinas (ex: 1 a 9, e 0 para optativas).
  - `selectedPeriod`, `setSelectedPeriod`: Período em visualização.
  - `searchQuery`, `setSearchQuery`: Termo de busca digitado.
  - `disciplinesList`, `displayedDisciplines`: Lista completa e lista filtrada de matérias.
  - `isDisciplineScheduled(id)`: Função booleana que verifica se já foi adicionada.
  - `toggleDiscipline(disc)`: Ação de adicionar/remover da grade.
  - `onShowDetails(disc)`: Ação de abrir modal de detalhes.
  - `completedDisciplines`, `toggleCompleted(id)`: Gestão de matérias concluídas.
  - `getDisciplineConflictInstance(disc)`: Verifica se há choque de horário.
- **Layout:**
  - Carrossel horizontal de períodos letivos (`1º`, `2º`, ..., `OPTATIVAS`).
  - Campo de busca com ícone de lupa e botão de limpar (X).
  - Lista com scroll vertical dos cards de disciplinas.
  - Cada card exibe: nome da disciplina, nome do docente, badge do período, badges com dia e hora de cada aula, checkbox de conclusão, ícone de informações (detalhes) e indicador de inclusão na grade.
- **Equivalente Flutter:** `DisciplineDrawer` ou coluna responsiva `ScheduleSidebarWidget`.

---

### 2.4. ScheduleGrid (Grade Semanal de Horários)
- **Objetivo:** Visualização tabular das aulas da semana alocadas pelo usuário, permitindo rápida visualização de buracos ou conflitos.
- **Props Recebidas:**
  - `mobileTab`: Aba ativa no mobile ('disciplines' ou 'schedule').
  - `schedule`: Array de disciplinas atualmente inseridas na grade.
  - `disciplinesList`: Lista total para extração de slots de horário.
  - `removeFromSchedule(id)`: Ação de remoção da matéria da grade.
  - `onShowDetails(disc)`: Ação de abertura dos detalhes.
- **Estrutura:**
  1. *Bloco de Alerta "Sem Horário Definido":* Exibido se alguma matéria na grade tiver `sessions.length === 0`.
  2. *Tabela Semanal:*
     - Cabeçalho: Coluna "Horário" + 6 colunas (Segunda a Sábado).
     - Linhas: Slots de horários ordenados cronologicamente:
       - `14:00 - 16:00`
       - `16:00 - 18:00`
       - `18:30 - 20:10`
       - `20:10 - 21:50`
     - Células da tabela: Se houver disciplina para aquele dia e horário, renderiza um bloco colorido (azul índigo) com nome, professor, botão de detalhes e botão de remoção rápida (X).
- **Equivalente Flutter:** `ScheduleGridWidget` utilizando `Table`, `GridView` ou `SingleChildScrollView` com `DataTable`.

---

### 2.5. MobileNav
- **Objetivo:** Barra de navegação inferior exclusiva para dispositivos móveis com telas compactas.
- **Props:**
  - `mobileTab`: Estado atual ('disciplines' | 'schedule').
  - `setMobileTab(tab)`: Altera aba ativa.
  - `schedule`: Utilizado para exibir badge com o contador de disciplinas adicionadas.
- **Equivalente Flutter:** `BottomNavigationBar` ou `NavigationBar` Material 3.

---

### 2.6. MatrizView
- **Objetivo:** Acompanhamento integral do curso de BCC, visualização da árvore de dependências e cálculo de formatura.
- **Estados Internos Importantes:**
  - `matrixVersion`: 'nova' ou 'antiga'.
  - `subjectsNew` / `subjectsOld`: Listas de matérias com status e notas.
  - `acexHours` e `accHours`: Cargas horárias extracurriculares.
  - `hoveredSubject` / `selectedSubject`: Disciplina selecionada para exibição de setas de conectores.
  - `arrows`: Lista de caminhos Bézier calculados para desenho em SVG.
  - `searchQuery`, `filterType`, `filterStatus`: Filtros rápidos.
  - `showResetConfirm`: Diálogo modal de confirmação de reset de progresso.
- **Seções da Interface:**
  1. *Barra Superior de Estatísticas:*
     - Barra de progresso percentual geral com barra de preenchimento dinâmica.
     - Indicador de Horas Obrigatórias integralizadas.
     - Indicador de Horas Optativas integralizadas.
     - Contadores editáveis de ACEX (máx 320h) e ACC (máx 90h).
     - Botão de alternar versão da matriz (Nova / Antiga).
     - Botões de exportação e importação de progresso da matriz (`bcc_progresso_matriz.json`).
     - Botão de reset de progresso.
  2. *Barra de Filtros:* Campo de texto, seletor de núcleo temático e seletor de status.
  3. *Quadro da Matriz Curricular:*
     - 9 Colunas representando os períodos letivos de 1 a 9.
     - Cabeçalho de cada coluna com total de horas do período e horas concluídas.
     - Cards de disciplinas com badges de núcleo (Básico, Computação, Optativa, Estágio, Outros).
     - Clique simples no card: seleciona para destacar pré-requisitos e dependências.
     - Clique duplo ou botão de status: alterna entre `Pendente` → `Cursando` → `Concluído`.
     - Campo de input de nota: visível apenas quando o status for `Concluído`.
  4. *Camada SVG de Setas (Overlay):*
     - Elemento SVG posicionado com `pointer-events-none` desenhando caminhos de curva Bézier conectando os pontos centrais das bordas dos cards.
     - Setas vermelhas/âmbar apontando para os pré-requisitos necessários.
     - Setas azuis/verdes apontando para as disciplinas que são liberadas.
- **Equivalente Flutter:** `CurriculumMatrixScreen` utilizando `InteractiveViewer`, `Row` com colunas de períodos e `CustomPainter` para renderizar as linhas de pré-requisitos com `Canvas.drawPath()`.

---

### 2.7. DisciplinesView (Catálogo)
- **Objetivo:** Consulta textual rápida de todas as disciplinas do curso ativo.
- **Props:** `setView`, `course`, `darkMode`, `themePreference`, `cycleTheme`.
- **Estados Internos:** `searchQuery`, `selectedPeriod`, `selectedType`, `selectedDiscipline`.
- **Elementos Visuais:**
  - Filtro em linha: busca por nome/código + combo de períodos + combo de tipos (Todas, Obrigatórias, Optativas).
  - Grid de cartões informativos com código da matéria, período, carga horária total, teórica, prática e botão "Ver Ementa".
  - Ao clicar em um cartão, abre o `DisciplineDetailsModal`.
- **Equivalente Flutter:** `CourseCatalogScreen` com `ListView.builder` e `FilterChip`.

---

### 2.8. DisciplineDetailsModal
- **Objetivo:** Exibir na íntegra todas as informações curriculares, pedagógicas e programáticas da disciplina.
- **Props Recebidas:**
  - `discipline`: Objeto da disciplina selecionada.
  - `onClose()`: Fecha o modal.
  - `completedDisciplines`: Lista de disciplinas concluídas.
  - `toggleCompleted(id)`: Alterna conclusão da matéria.
  - `getDisciplineConflictInstance(disc)`: Alerta se choca com a grade atual.
- **Conteúdo Exibido:**
  - Alerta de choque de horário (caso haja conflito com a grade horária montada).
  - Tags de tipo, período recomendado e quantidade de créditos acadêmicos.
  - Box de Carga Horária: Teórica, Prática, Extensão e Total em horas.
  - Listas de Pré-requisitos, Co-requisitos e Equivalências curriculares.
  - Texto completo da Ementa oficial.
  - Lista de itens do Conteúdo Programático.
  - Rodapé com botão de marcar como concluída e botão de fechar.
- **Equivalente Flutter:** `DisciplineDetailsDialog` ou `showModalBottomSheet`.

---

### 2.9. AdminView
- **Objetivo:** Extração com IA via Gemini e edição de novos cursos / horários a partir de PDFs oficiais.
- **Estados:**
  - `isExtracting`: Spinner de carregamento durante chamada da IA.
  - `extractedDisciplines`: Array de disciplinas resultantes para revisão.
  - `editingIndex`: Índice da matéria em edição inline.
  - `reviewTab`: Aba de visualização ('table', 'visual' ou 'json').
  - `savedCourses`: Lista de cursos salvos no servidor local.
- **Equivalente Flutter:** `AdminExtractionScreen` com upload via `file_picker` e chamadas à API REST ou diretamente ao SDK `google_generative_ai`.
