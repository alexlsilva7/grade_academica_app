# 03 - Inventário de Funcionalidades do Sistema

A tabela abaixo consolida todas as funcionalidades presentes no código-fonte original, indicando sua localização nos módulos React/TypeScript e o comportamento de referência exigido para a nova implementação em Flutter.

---

## Tabela Geral de Funcionalidades

| ID | Módulo | Funcionalidade | Localização Original (React/TS) | Comportamento e Regras de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| **FN01** | Geral / Tema | Alternância de Tema Claro / Escuro / Sistema | `useSchedule.ts` (`themePreference`, `cycleTheme`), `Navbar.tsx`, `HomeView.tsx` | Ciclo sequencial: Sistema → Claro → Escuro → Sistema. Aplica classe `dark` no elemento raiz e persiste chave `themePreference`. No mobile/desktop Flutter: `ThemeMode.system`, `ThemeMode.light`, `ThemeMode.dark`. |
| **FN02** | Home | Seleção de Curso (BCC, EAL, ADM) | `HomeView.tsx`, `useSchedule.ts` (`selectedCourse`, `changeCourse`) | Altera o curso global ativo, gravando em `selectedCourse`. Se nulo, exibe a grade de seleção; se preenchido, exibe opções do curso. |
| **FN03** | Home | Cursos Desabilitados / Em Breve | `HomeView.tsx` | Cursos como Agronomia, Pedagogia, Zootecnia etc. aparecem com opacidade reduzida e badge "Em breve", sem ação de clique. |
| **FN04** | Home | Acesso Direto às Vias | `HomeView.tsx` | Três cards principais: Horário Letivo (`loadPredefinedGrade`), Disciplinas (`setView('disciplines')`) e Matriz Curricular (`setView('matriz')`). |
| **FN05** | Grade | Carregamento dos Dados do Semestre | `data.ts`, `data/bcc/`, `data/adm/`, `data/eal/` | Importa os JSONs oficiais: `horario_bcc_2026_1.json`, `horario_eal_2026_1.json`, `horario_adm_2026_1.json`. |
| **FN06** | Grade | Seleção de Período Letivo na Sidebar | `Sidebar.tsx`, `useSchedule.ts` (`selectedPeriod`) | Botões horizontais com os períodos disponíveis (1º a 9º + OPTATIVAS). Ao clicar, filtra a lista lateral e limpa a busca. |
| **FN07** | Grade | Busca em Tempo Real de Disciplinas | `Sidebar.tsx`, `useSchedule.ts` (`searchQuery`) | Campo de input com limpeza rápida (botão X). Normaliza acentos e maiúsculas, pesquisando no nome da matéria e no nome do professor. |
| **FN08** | Grade | Adicionar/Remover Disciplina da Grade | `useSchedule.ts` (`toggleDiscipline`, `removeFromSchedule`), `Sidebar.tsx`, `ScheduleGrid.tsx` | Alterna inclusão. Se já estiver na grade, remove. Se não estiver, avalia se há conflito antes de adicionar. |
| **FN09** | Grade | Detecção de Choque de Horários | `useSchedule.ts` (`hasConflict`, `parseTimeToMinutes`) | Converte faixas de horário em minutos absolutos desde as 00:00. Avalia se `startA < endB` e `startB < endA` para o mesmo dia da semana. Ignora a própria matéria. |
| **FN10** | Grade | Alerta de Conflito em Tempo Real | `useSchedule.ts` (`conflictMsg`), `App.tsx`, `Sidebar.tsx` | Exibe toast flutuante superior vermelho com auto-dismiss (4s). Na sidebar, mostra badge âmbar pulsante informando com qual matéria há o choque. |
| **FN11** | Grade | Grid Visual Semanal de Horários | `ScheduleGrid.tsx`, `constants.ts` (`DAYS`, `TIMESLOTS`) | Tabela com colunas de Segunda a Sábado e linhas com os 4 slots padrão (`14:00-16:00`, `16:00-18:00`, `18:30-20:10`, `20:10-21:50`). |
| **FN12** | Grade | Disciplinas Sem Horário Definido | `ScheduleGrid.tsx` (`undeterminedDisciplines`) | Matérias cuja lista `sessions` é vazia são alocadas em um card destacado acima da grade semanal. |
| **FN13** | Grade | Marcação de Disciplina Concluída | `useSchedule.ts` (`toggleCompleted`), `Sidebar.tsx`, `DisciplineDetailsModal.tsx` | Alterna presença no array `completedDisciplines`. Ao marcar como concluída: remove da grade atual de horários e sincroniza status 'concluido' na matriz. |
| **FN14** | Grade | Persistência por Curso | `useSchedule.ts` (`localStorage.setItem('schedule_${course}')`) | Cada curso armazena sua grade montada em chave isolada (`schedule_bcc`, `schedule_eal`, `schedule_adm`). |
| **FN15** | Matriz | Alternância Matriz Nova vs. Antiga | `MatrizView.tsx` (`matrixVersion`) | Permite alternar entre o currículo novo e o antigo de BCC. Cada matriz preserva seu estado de progresso de forma independente. |
| **FN16** | Matriz | Estados da Disciplina | `MatrizView.tsx` (`status`) | Três estados: `pendente` (cinza/branco), `cursando` (azul/índigo) e `concluido` (verde esmeralda). |
| **FN17** | Matriz | Sincronização Automática com Grade | `MatrizView.tsx` (`getSubjectStatus`) | Se uma matéria estiver na grade semanal montada e estiver com status `pendente` na matriz, ela é renderizada como `cursando`. |
| **FN18** | Matriz | Grafo de Conexões e Pré-requisitos | `MatrizView.tsx` (`updateArrowCoordinates`, `getCurvePath`, SVG overlay) | Desenha curvas Bézier cúbicas dinâmicas conectando o card ativo aos seus pré-requisitos (setas azuis/vermelhas) e matérias desbloqueadas (setas verdes). |
| **FN19** | Matriz | Verificação de Liberação de Matérias | `MatrizView.tsx` (`isUnlocked`) | Uma matéria está desbloqueada (`isUnlocked = true`) se todas as matérias listadas no array `prereqs` estiverem com `status === 'concluido'`. |
| **FN20** | Matriz | Lançamento de Nota Final | `MatrizView.tsx` (`handleGradeChange`) | Input numérico para disciplinas concluídas, validando notas entre 0.0 e 10.0 (suportando vírgula e ponto decimal). |
| **FN21** | Matriz | Lançamento de Horas ACEX e ACC | `MatrizView.tsx` (`acexHours`, `accHours`) | Inputs de carga horária para extensão (ACEX teto 320h) e complementar (ACC teto 90h). |
| **FN22** | Matriz | Cálculo de Progresso Curricular | `MatrizView.tsx` (`stats`) | `progressPercent = Math.min(100, (totalConcluido / 3200) * 100)`. Exibe progresso percentual, total de horas obrigatórias e optativas. |
| **FN23** | Matriz | Filtros e Pesquisa na Matriz | `MatrizView.tsx` (`filteredSubjects`) | Filtros por núcleo temático (Básico, Computação, Optativa, Estágio, Outros) e por status (Todos, Concluído, Cursando, Pendente, Disponível). |
| **FN24** | Matriz | Reset de Progresso | `MatrizView.tsx` (`resetProgress`) | Modal de confirmação para limpar o progresso da matriz atual, zerando status, notas, ACEX e ACC. |
| **FN25** | Catálogo | Consulta e Filtragem de Ementas | `DisciplinesView.tsx` | Lista completa de matérias do curso ativo (BCC, EAL, ADM). Filtro por período letivo e por tipo (Obrigatória / Optativa). |
| **FN26** | Detalhes | Modal de Detalhes da Disciplina | `DisciplineDetailsModal.tsx`, `detailsHelper.ts` | Cruza dados do horário com `curriculo_bcc.json` e `conteudos_bcc.json` por código ou nome normalizado, exibindo ementa e conteúdos. |
| **FN27** | Backup | Exportação Completa de Dados | `backupHelper.ts` (`exportAllUserData`) | Gera download do arquivo `my_ufape_backup.json` contendo todas as 13 chaves de configuração do usuário. |
| **FN28** | Backup | Importação e Restauração | `backupHelper.ts` (`importAllUserData`) | Lê arquivo `.json`, valida se é um objeto válido, restaura as chaves e recarrega o estado do app. |
| **FN29** | Admin | Proteção de Ambiente | `domain.ts` (`isProduction`), `App.tsx` | Se o domínio atual for `bcc-ufape.vercel.app`, a rota `/admin` é bloqueada e redirecionada para a Home. |
| **FN30** | Admin | Extração de PDF via Gemini API | `AdminView.tsx`, `server.ts` (`/api/extract-pdf`) | Envia PDF em base64 com prompt do sistema acadêmico UFAPE para o modelo Gemini multimodal e obtém JSON estruturado de turmas e sessões. |
| **FN31** | Admin | Revisão e Edição de Grade Extraída | `AdminView.tsx` | Tabela interativa para alterar título, adicionar/remover sessões, editar códigos de disciplinas, professores e períodos. |
| **FN32** | Admin | Gestão de Cursos no Servidor | `AdminView.tsx`, `server.ts` (`/api/courses`) | CRUD de cursos customizados armazenados no arquivo `custom_cursos.json` do backend. |
