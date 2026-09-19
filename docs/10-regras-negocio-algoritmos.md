# 10 - Regras de Negócio e Algoritmos

Este documento detalha os algoritmos fundamentais, formulações matemáticas e regras de validação que regem o comportamento do **My UFAPE**.

---

## 1. Algoritmo de Detecção de Conflitos de Horário

### 1.1. Conversão de String de Horário para Minutos (`parseTimeToMinutes`)
Cada intervalo de horário fornecido no formato `"HH:MM - HH:MM"` é decomposto em dois inteiros que representam a quantidade de minutos transcorridos desde as `00:00`:

$$\text{Minutos} = (\text{Hora} \times 60) + \text{Minuto}$$

**Pseudocódigo de Referência:**
```typescript
function parseTimeToMinutes(timeStr: string): { start: number; end: number } | null {
  const parts = timeStr.split('-');
  if (parts.length !== 2) return null;

  const parseSingle = (s: string) => {
    const t = s.trim().split(':');
    if (t.length !== 2) return 0;
    return parseInt(t[0], 10) * 60 + parseInt(t[1], 10);
  };

  return {
    start: parseSingle(parts[0]),
    end: parseSingle(parts[1])
  };
}
```

*Exemplo:*
- `"18:30 - 20:10"` $\rightarrow$ `start: 1110` min, `end: 1210` min.
- `"20:10 - 21:50"` $\rightarrow$ `start: 1210` min, `end: 1310` min.

### 1.2. Condição de Sobreposição Temporal
Duas sessões $A$ e $B$ no mesmo dia da semana entram em conflito se, e somente se, houver intersecção com duração positiva entre seus intervalos abertos:

$$\text{Sobreposição} \iff (\text{start}_A < \text{end}_B) \land (\text{start}_B < \text{end}_A)$$

Se os dois intervalos forem adjacentes (ex: `end_A == 1210` e `start_B == 1210`), **não há conflito**, pois $\text{start}_B < \text{end}_A$ é falso.

### 1.3. Regra de Negócio Completa de Conflito
Para verificar se uma nova disciplina pode ser inserida na grade:
1. Itera sobre todas as sessões da nova disciplina (`newDisc.sessions`).
2. Para cada sessão, itera sobre todas as disciplinas já presentes na grade (`scheduledDisc`).
3. Se `scheduledDisc.id == newDisc.id`, desconsidera (é a própria matéria).
4. Para cada sessão da matéria agendada:
   - Se `session.day == scheduledSession.day`:
     - Avalia a sobreposição via `parseTimeToMinutes`.
     - Caso detectada sobreposição, retorna `{ conflict: true, withName: scheduledDisc.name }`.
5. Se nenhuma sessão sobrepuser, retorna `{ conflict: false }`.

---

## 2. Algoritmo de Liberação de Pré-requisitos (`isUnlocked`)

Na matriz curricular, uma disciplina possui um array `prereqs` com os IDs das matérias indispensáveis.

### 2.1. Regra de Liberação
- Se a disciplina possui `prereqs.length === 0`, ela está **desbloqueada por definição** (`isUnlocked = true`).
- Se possui pré-requisitos, ela só estará desbloqueada se **todos** os seus pré-requisitos estiverem com o status `concluido`:

$$\text{isUnlocked}(D) = \forall P \in D.\text{prereqs}, \quad \text{status}(P) = \text{'concluido'}$$

**Pseudocódigo:**
```typescript
function isUnlocked(subjectId: string, subjects: Subject[]): boolean {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject || subject.prereqs.length === 0) return true;
  return subject.prereqs.every(preId => {
    const pre = subjects.find(s => s.id === preId);
    return pre && pre.status === 'concluido';
  });
}
```

---

## 3. Sincronização Bidirecional entre Grade e Matriz

O sistema mantém consistência automática entre a grade de horários do semestre e a matriz curricular:

### 3.1. Quando o usuário marca uma matéria como Concluída:
1. O identificador (`disc.code` ou `disc.id`) é adicionado à lista persistida `completedDisciplines`.
2. A matéria é **imediatamente removida** da grade de horários semanal (`schedule = schedule.filter(...)`), liberando os slots de horário.
3. Na matriz curricular (`bcc_matriz_progress`), a matéria correspondente tem seu status alterado para `'concluido'`.

### 3.2. Quando uma matéria é desmarcada de Concluída:
1. O identificador é removido de `completedDisciplines`.
2. Na matriz curricular, o status volta para `'pendente'` e a nota (`grade`) é limpa (`""`).

### 3.3. Indicação de "Cursando" Automática:
Se uma matéria estiver presente na grade horária semanal (`schedule`) e na matriz curricular seu status estiver como `'pendente'`, a visualização da matriz deve renderizá-la visualmente com a tag/estilo de **`Cursando`**.

---

## 4. Fórmulas de Carga Horária e Progresso de Conclusão

### 4.1. Constantes da UFAPE para Ciência da Computação (BCC)
- **Carga Horária Total Exigida:** $3.200\text{ horas}$.
- **Teto Máximo de Extensão (ACEX):** $320\text{ horas}$ ($10\%$ do curso).
- **Teto Máximo de Atividades Complementares (ACC):** $90\text{ horas}$.

### 4.2. Cálculo das Horas Acadêmicas
- **Horas Regulares Concluídas:** Soma da carga horária (`hours`) de todas as disciplinas obrigatórias com `status === 'concluido'`.
- **Horas Optativas Concluídas:** Soma da carga horária de todas as disciplinas do tipo `optativa` com `status === 'concluido'`.

$$\text{HorasAcademicas} = \text{HorasRegulares} + \text{HorasOptativas}$$

### 4.3. Cálculo do Total com Extracurriculares
As horas de ACEX e ACC informadas pelo usuário são limitadas aos seus respectivos tetos:

$$\text{ACEX}_{\text{valida}} = \min(320, \text{acexHours})$$
$$\text{ACC}_{\text{valida}} = \min(90, \text{accHours})$$
$$\text{TotalIntegralizado} = \text{HorasAcademicas} + \text{ACEX}_{\text{valida}} + \text{ACC}_{\text{valida}}$$

### 4.4. Percentual de Progresso
$$\text{Progresso} (\%) = \min\left(100, \frac{\text{TotalIntegralizado}}{3200} \times 100\right)$$

---

## 5. Algoritmo Geométrico das Conexões de Pré-Requisitos (Curvas Bézier Cúbicas)

Para ligar um card de disciplina fonte ($A$) a um card alvo ($B$) na matriz curricular sem sobrepor os textos, o sistema calcula uma curva Bézier cúbica no padrão SVG (`M startX startY C cp1x cp1y, cp2x cp2y, endX endY`):

### 5.1. Determinação dos Pontos de Início e Fim
Com base nos retângulos delimitadores dos elementos:
- Se $B$ está à direita de $A$ ($\Delta X > 0$):
  - Início: Ponto médio da borda direita de $A$ ($X = A.\text{right}$, $Y = A.\text{top} + A.\text{height}/2$).
  - Fim: Ponto médio da borda esquerda de $B$ ($X = B.\text{left}$, $Y = B.\text{top} + B.\text{height}/2$).
- Se $B$ está à esquerda de $A$ ($\Delta X < 0$):
  - Início: Ponto médio da borda esquerda de $A$.
  - Fim: Ponto médio da borda direita de $B$.
- Se $A$ e $B$ estão na mesma coluna ($|\Delta X| < 15$):
  - Conexão vertical entre o centro inferior de um e o centro superior do outro.

### 5.2. Cálculo dos Pontos de Controle ($cp1$ e $cp2$)
Para criar uma curva suave que parte horizontalmente e converge horizontalmente:

$$\text{offset} = \max(30, |\Delta X| \times 0.4)$$
$$cp1_x = \text{startX} + (\Delta X > 0 ? \text{offset} : -\text{offset})$$
$$cp1_y = \text{startY}$$
$$cp2_x = \text{endX} - (\Delta X > 0 ? \text{offset} : -\text{offset})$$
$$cp2_y = \text{endY}$$

Isso gera a instrução vetorial SVG:
```
M {startX} {startY} C {cp1x} {cp1y}, {cp2x} {cp2y}, {targetX} {targetY}
```
No Flutter, essa mesma geometria é reproduzida diretamente com `Path.cubicTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY)` dentro de um `CustomPainter`.

---

## 6. Algoritmo de Normalização de Horários na Extração de PDF

Os editais e quadros de horários da UFAPE frequentemente trazem aulas compactadas em blocos de 4 horas (ex.: `"h1400_1800"` ou `"14:00 - 18:00"`).

### 6.1. Regra de Fatiamento (Split de Blocos)
O sistema aceita estritamente 4 slots de 2 horas no turno vespertino/noturno:
- Slot 1: `"14:00 - 16:00"`
- Slot 2: `"16:00 - 18:00"`
- Slot 3: `"18:30 - 20:10"`
- Slot 4: `"20:10 - 21:50"`

Se a IA identificar um bloco contínuo de 4 horas, o algoritmo deve obrigatoriamente desmembrá-lo em **duas sessões** distintas na mesma disciplina:
- Sessão A: `day: D`, `time: '14:00 - 16:00'`
- Sessão B: `day: D`, `time: '16:00 - 18:00'`

### 6.2. Agregação por Disciplina
Turmas que possuem aulas em dias alternados (ex: Quarta e Sexta) não podem ser geradas como itens separados na lista. Elas devem ser consolidadas em uma única entidade `Discipline`, agregando todas as sessões no seu array `sessions`.
