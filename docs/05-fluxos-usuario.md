# 05 - Fluxos de Usuário e Navegação

Este documento mapeia os principais fluxos operacionais do usuário dentro do **My UFAPE**, utilizando diagramas visuais em formato **Mermaid**.

---

## 1. Fluxo Geral de Navegação do Aplicativo

```mermaid
flowchart TD
    Start([Início do App]) --> CheckCourse{Curso Selecionado no LocalStorage?}
    
    CheckCourse -- Não --> ViewHomeNoCourse[HomeView: Exibir Seletor de Cursos UFAPE]
    CheckCourse -- Sim --> ViewHomeWithCourse[HomeView: Exibir Hub de Acesso do Curso]
    
    ViewHomeNoCourse --> UserSelectsCourse[Usuário Clica em BCC, EAL ou ADM]
    UserSelectsCourse --> SaveSelectedCourse[Gravar selectedCourse no Storage]
    SaveSelectedCourse --> ViewHomeWithCourse

    ViewHomeWithCourse --> ActionChoice{Escolha do Usuário}
    
    ActionChoice -- Clicar em Horário Letivo --> LoadGrade[Carregar Horários do Curso]
    LoadGrade --> ScheduleScreen[Tela de Horário Letivo: Sidebar + Grid]
    
    ActionChoice -- Clicar em Disciplinas --> CatalogScreen[Tela Catálogo de Disciplinas]
    
    ActionChoice -- Clicar em Matriz Curricular --> MatrixScreen[Tela Matriz Curricular BCC]
    
    ActionChoice -- Clicar em Alterar Curso --> ClearCourse[Remover selectedCourse]
    ClearCourse --> ViewHomeNoCourse

    ActionChoice -- Clicar em Admin IA --> AdminScreen[Painel Admin / Extração PDF]
```

---

## 2. Fluxo de Montagem de Grade e Resolução de Conflitos

```mermaid
flowchart TD
    InSchedule[Usuário na Tela de Grade Horária] --> BrowsePeriod[Selecionar Período Letivo ou Buscar por Nome]
    BrowsePeriod --> ViewDisciplineCard[Visualiza Card da Disciplina]
    
    ViewDisciplineCard --> CheckCompleted{Disciplina está marcada como Concluída?}
    CheckCompleted -- Sim --> CardDisabled[Card com opacidade e indicação de Concluída. Não adiciona.]
    
    CheckCompleted -- Não --> ClickToggle[Usuário Clica no Card para Adicionar]
    
    ClickToggle --> IsAlreadyScheduled{Já está na Grade?}
    IsAlreadyScheduled -- Sim --> RemoveFromSchedule[Remover Disciplina da Grade]
    RemoveFromSchedule --> UpdateStorage[Atualizar Storage da Grade do Curso]
    
    IsAlreadyScheduled -- Não --> ConflictCheck{Existe Conflito com outra Matéria da Grade?}
    
    ConflictCheck -- Sim (Mesmo dia e sobreposição de horário) --> ShowConflictToast[Exibir Toast Vermelho: Conflito com Matéria X]
    ShowConflictToast --> PreventAddition[Manter Grade Inalterada]
    
    ConflictCheck -- Não --> AddToSchedule[Adicionar à Grade Semanal]
    AddToSchedule --> RenderCell[Renderizar Bloco nas Células da Tabela Semanal]
    RenderCell --> UpdateStorage
```

---

## 3. Fluxo de Acompanhamento da Matriz Curricular (BCC)

```mermaid
flowchart TD
    InMatriz[Usuário na Tela Matriz Curricular] --> SelectMatrixVersion{Selecionar Versão}
    SelectMatrixVersion -- Nova --> ShowNewMatrix[Exibir Matriz Curricular Vigente]
    SelectMatrixVersion -- Antiga --> ShowOldMatrix[Exibir Matriz Curricular Anterior]
    
    ShowNewMatrix --> SelectSubject[Usuário Clica em uma Disciplina]
    ShowOldMatrix --> SelectSubject
    
    SelectSubject --> DrawArrows[Calcular e Desenhar Setas Bézier de Dependências]
    DrawArrows --> ShowPrereqs[Destacar Pré-requisitos Vermelho/Âmbar]
    DrawArrows --> ShowUnlocks[Destacar Disciplinas Liberadas Azul/Verde]
    
    SelectSubject --> ChangeStatusAction{Usuário Altera Status}
    
    ChangeStatusAction -- Pendente -> Cursando --> SetCursando[Status = Cursando]
    ChangeStatusAction -- Cursando -> Concluído --> SetConcluido[Status = Concluído]
    ChangeStatusAction -- Concluído -> Pendente --> SetPendente[Status = Pendente, Limpa Nota]
    
    SetConcluido --> PromptGrade[Habilitar Campo de Nota 0.0 - 10.0]
    SetConcluido --> SyncCompleted[Sincronizar com completedDisciplines do Storage]
    SyncCompleted --> RemoveFromScheduleIfPresent[Se estiver na Grade Horária, Remover]
    
    SetConcluido --> RecalculateStats[Recalcular Estatísticas do Curso]
    RecalculateStats --> UpdateProgressPercent[Atualizar Barra de Progresso e Horas de BCC]
```

---

## 4. Fluxo de Backup e Restauração de Dados

```mermaid
flowchart LR
    subgraph Exportação
        ExpBtn[Clicar no Botão Exportar] --> CollectKeys[Coletar todas as 13 chaves do Storage]
        CollectKeys --> PackJSON[Empacotar em Objeto JSON único]
        PackJSON --> DownloadFile[Disparar Download de my_ufape_backup.json]
    end

    subgraph Importação
        ImpBtn[Clicar no Botão Importar] --> SelectFile[Selecionar Arquivo .json]
        SelectFile --> ParseJSON{JSON Válido?}
        ParseJSON -- Não --> ShowError[Exibir Alerta: Arquivo inválido]
        ParseJSON -- Sim --> RestoreKeys[Substituir chaves no Storage local]
        RestoreKeys --> ReloadApp[Recarregar Estado da Aplicação com Sucesso]
    end
```

---

## 5. Fluxo de Extração de Grade em PDF via Inteligência Artificial

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador/Usuário
    participant UI as Painel AdminView
    participant Server as Backend (server.ts / Cloud Function)
    participant Gemini as Google Gemini 3.5 / 2.0 Flash

    Admin->>UI: Faz upload do PDF do horário da UFAPE
    UI->>UI: Converte arquivo para Base64
    UI->>Server: POST /api/extract-pdf (base64, mimeType, model)
    Note over Server,Gemini: Utiliza Prompt Especializado com regras UFAPE
    Server->>Gemini: generateContent (inlineData: PDF, systemInstruction, schema)
    Gemini-->>Server: JSON estruturado (turmas, slots, sessões, professores)
    Server-->>UI: Resposta 200 OK com disciplinas extraídas
    UI->>UI: Sanitiza períodos e valida dias (1 a 6)
    UI->>Admin: Exibe tabela interativa para revisão manual
    Admin->>UI: Edita eventuais inconsistências ou professores
    Admin->>Server: POST /api/courses (salva curso customizado)
    Server-->>UI: Confirmado salvamento
    UI->>Admin: Alerta de sucesso e disponibilidade na lista de cursos
```
