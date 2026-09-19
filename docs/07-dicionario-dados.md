# 07 - Dicionário de Dados

Este documento lista exaustivamente todas as propriedades de dados manipuladas pelo aplicativo **My UFAPE**, com tipos primitivos, restrições e regras de validação.

---

## 1. Entidade: Disciplina da Grade (`Discipline`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | Sim | Identificador único da disciplina dentro da grade | `"p1_1"`, `"ccmp3057_t1"` | Deve ser único no array de disciplinas da grade; não conter espaços vazios. |
| `code` | `String` | Não | Código oficial da UFAPE (4 letras + 4 números) | `"CCMP3057"`, `"MATM3008"` | Geralmente segue o regex `^[A-Z]{4}[0-9]{4}$`. |
| `name` | `String` | Sim | Nome da disciplina com identificação de turma | `"Cálculo I (Turma 1)"` | String não vazia. Máximo de 150 caracteres. |
| `professor` | `String` | Sim | Nome do docente que leciona a turma | `"Prof. Normando"`, `"-"` | Caso não haja docente definido, preencher com `"-"`. |
| `period` | `Integer` | Sim | Período recomendado de oferta | `1`, `2`, `...`, `9`, `0` | Inteiro de 0 a 9. `0` representa disciplinas optativas ou eletivas. |
| `sessions` | `Array<Session>` | Sim | Lista de sessões de aula semanais | `[{"day": 1, "time": "18:30 - 20:10"}]` | Pode ser um array vazio caso a matéria não tenha horário fixo. |

---

## 2. Objeto de Valor: Sessão de Aula (`Session`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `day` | `Integer` | Sim | Dia da semana em que a aula ocorre | `1`, `2`, `3`, `4`, `5`, `6` | Deve ser estritamente um valor de 1 (Segunda) a 6 (Sábado). |
| `time` | `String` | Sim | Intervalo de horário da aula | `"18:30 - 20:10"` | Deve conter formato `HH:MM - HH:MM`. Slots padrão aceitos: `"14:00 - 16:00"`, `"16:00 - 18:00"`, `"18:30 - 20:10"`, `"20:10 - 21:50"`. |

---

## 3. Entidade: Disciplina da Matriz Curricular (`Subject`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | Sim | Slug único identificador da matéria na matriz | `"log_mat_1"`, `"calc_1"` | Chave primária do grafo. |
| `code` | `String` | Não | Código acadêmico da matéria | `"MATM3008"` | Formato alfanumérico. |
| `name` | `String` | Sim | Nome formal da matéria | `"Lógica Matemática I"` | Não vazio. |
| `hours` | `Integer` | Sim | Carga horária total da disciplina | `30`, `60`, `90`, `300` | Inteiro positivo maior que zero. |
| `period` | `Integer` | Sim | Período curricular correspondente | `1` a `9` | Inteiro de 1 a 9. |
| `type` | `String` | Sim | Classificação por núcleo acadêmico | `"basico"`, `"computacao"`, `"optativa"`, `"estagio"`, `"outros"` | Deve pertencer aos 5 núcleos pré-definidos para coloração e soma. |
| `prereqs` | `Array<String>` | Sim | Lista de `id`s das disciplinas pré-requisito | `["geo_anal"]`, `["aed_1", "alg_lin"]` | Cada elemento deve corresponder a um `id` válido de outra disciplina da mesma matriz. |
| `desc` | `String` | Sim | Resumo do plano e objetivos da matéria | `"Introdução à lógica..."` | Texto livre. |
| `status` | `String` | Sim | Estado de cumprimento acadêmico do aluno | `"pendente"`, `"cursando"`, `"concluido"` | Enum restrito a esses três valores. |
| `grade` | `String` | Sim | Nota final obtida na matéria | `""`, `"8.5"`, `"10.0"` | String vazia quando não concluída; número float entre 0.0 e 10.0 quando concluída. |

---

## 4. Entidade: Detalhamento Pedagógico (`SubjectDetails`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `code` | `String` | Sim | Código oficial da matéria | `"CCMP3006"` | Alfanumérico. |
| `name` | `String` | Sim | Nome da disciplina | `"ALGORITMOS E ESTRUTURA DE DADOS I"` | String não vazia. |
| `type` | `String` | Sim | Categoria ("Obrigatório" ou "Optativo") | `"Obrigatório"` | String. |
| `period` | `String` | Sim | Período de oferta | `"2"` | String numérica. |
| `credits` | `Integer` | Sim | Quantidade de créditos acadêmicos | `4` | Inteiro positivo (geralmente `hours / 15`). |
| `workload` | `Object` | Sim | Detalhamento de cargas horárias | `{"teorica": 60, "pratica": 0, "extensao": 0, "total": 60}` | `total == teorica + pratica + extensao`. |
| `prerequisites` | `Array<Object>` | Sim | Lista de matérias necessárias | `[{"code": "CCMP3057", "name": "INTRODUÇÃO"}]` | Array de objetos com `code` e `name`. |
| `corequisites` | `Array<Object>` | Sim | Lista de co-requisitos simultâneos | `[]` | Array de objetos com `code` e `name`. |
| `equivalences` | `Array<Object>` | Sim | Lista de matérias equivalentes no histórico | `[{"code": "BCC00027", "name": "AED I"}]` | Array de objetos com `code` e `name`. |
| `ementa` | `String` | Sim | Texto oficial da ementa | `"Resolução de problemas..."` | Texto livre. |

---

## 5. Entidade: Conteúdo Programático (`SubjectProgramContent`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `codigo` | `String` | Sim | Código de referência do plano de aula | `"BCC0024"` | Alfanumérico. |
| `nome` | `String` | Sim | Nome da matéria | `"Introdução à Programação I"` | String não vazia. |
| `tipo` | `String` | Sim | Classificação da matéria | `"Obrigatória"` | String. |
| `conteudo_programatico` | `String` | Sim | Tópicos numerados separados por ponto e vírgula | `"1. Conceitos; 2. Tipos de dados; 3. Funções."` | Texto estruturado separado por `;`. |

---

## 6. Entidade: Curso Customizado (`CustomCourse`)

| Campo | Tipo | Obrigatório | Descrição | Exemplo de Valor | Regras de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | Sim | Slug identificador do curso | `"bcc_2026_1"` | Slug alfanumérico sem caracteres especiais. |
| `title` | `String` | Sim | Nome de exibição do curso ou grade | `"BCC 2026.1 - Horário Letivo"` | String não vazia. |
| `disciplines` | `Array<Discipline>` | Sim | Array completo das disciplinas do curso | `[...]` | Deve conter pelo menos 1 disciplina válida. |
| `updated_at` | `String` | Sim | Data e hora ISO 8601 da gravação | `"2026-09-18T21:45:00.000Z"` | Formato ISO 8601 UTC. |
