# 01 - Visão Geral do Produto (PRD)

## 1. Identificação do Produto
- **Nome do Projeto:** My UFAPE (Grade Acadêmica UFAPE)
- **Natureza:** Assistente acadêmico web e mobile para planejamento de horários, acompanhamento curricular e catálogo de disciplinas universitárias.
- **Público-alvo Principal:** Discentes de graduação e docentes da Universidade Federal do Agreste de Pernambuco (UFAPE).
- **Stack Atual (Legado):** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Express.js (Node), Google GenAI SDK (Gemini).
- **Stack Alvo da Migração:** Flutter 3.x (Dart), multiplataforma (Android, iOS, Web e Desktop).

---

## 2. Objetivo e Proposta de Valor
Durante o período de matrícula e rematrícula da UFAPE, os discentes enfrentam dificuldades recorrentes:
1. **Choques de Horário Involuntários:** Dificuldade de conferir manualmente se duas disciplinas obrigatórias ou optativas possuem aulas concomitantes no mesmo dia e intervalo de tempo.
2. **Navegação em Ementas e Pré-requisitos:** PPCs (Projetos Pedagógicos de Curso) longos em formato PDF, tornando lenta a verificação de cadeias de dependências e liberação de disciplinas para o semestre seguinte.
3. **Cálculo de Carga Horária e Integralização:** Falta de clareza imediata sobre quantas horas de disciplinas obrigatórias, optativas, ACEX (Atividades Curriculares de Extensão) e ACC (Atividades Complementares) já foram integralizadas.

O **My UFAPE** resolve essas dores oferecendo:
- Visualização e montagem interativa de grade semanal com detecção instantânea de conflitos.
- Matriz curricular visual com grafo de pré-requisitos interativo e cálculo de progresso percentual de conclusão de curso.
- Consulta instantânea ao catálogo de ementas, cargas horárias e conteúdos programáticos.
- Extração automatizada de quadros de horários em PDF via Inteligência Artificial (Gemini).
- Persistência 100% local com importação/exportação de backups JSON, garantindo privacidade e disponibilidade offline.

---

## 3. Cursos Atualmente Suportados e Roadmap

| Sigla | Curso | Status da Grade de Horários | Status da Matriz Curricular | Status do Catálogo de Ementas |
| :--- | :--- | :--- | :--- | :--- |
| **BCC** | Bacharelado em Ciência da Computação | Disponível (2026.1) | Disponível (Nova e Antiga) | Disponível Completo |
| **EAL** | Engenharia de Alimentos | Disponível (2026.1) | Em breve | Disponível (Horário) |
| **ADM** | Bacharelado em Administração | Disponível (2026.1) | Em breve | Disponível Completo |
| **AGRO**| Agronomia | Em breve | Em breve | Em breve |
| **CONT**| Ciências Contábeis | Em breve | Em breve | Em breve |
| **LET** | Letras | Em breve | Em breve | Em breve |
| **MEDV**| Medicina Veterinária | Em breve | Em breve | Em breve |
| **PED** | Pedagogia | Em breve | Em breve | Em breve |
| **ZOO** | Zootecnia | Em breve | Em breve | Em breve |

---

## 4. Principais Módulos do Sistema

### 4.1. Início (Home)
- Ponto de entrada do usuário.
- Seletor de curso ativo entre os disponíveis na UFAPE.
- Cartões de navegação direta para:
  - **Horário Letivo** (Montagem de grade);
  - **Catálogo de Disciplinas**;
  - **Matriz Curricular** (disponível no momento para BCC);
  - **Painel de Administração / Extração com IA** (ativo em ambiente de desenvolvimento ou autenticado).
- Controles globais de tema (Claro / Escuro / Sistema) e utilitários de backup (Exportar / Importar).

### 4.2. Grade Horária (Horário Letivo)
- Tela dividida (layout adaptativo para mobile e desktop):
  - **Sidebar lateral:** Lista de períodos letivos (1º ao 9º e Optativas), busca em tempo real por nome ou docente, lista de matérias com badges de horários, botão de inclusão e marcação de disciplina já cursada.
  - **Grid de Horários:** Tabela semanal (Segunda a Sábado) dividida pelos blocos horários oficiais da universidade, exibindo matérias alocadas, avisos de choque de horário e seção para disciplinas sem horário formalmente alocado.
  - **Modal de Detalhes:** Apresentação da ementa, pré-requisitos, co-requisitos, equivalências e conteúdo programático da disciplina selecionada.

### 4.3. Matriz Curricular (Acompanhamento e Grafo)
- Visualização em colunas estruturadas por períodos (1º ao 9º período).
- Suporte a duas matrizes curriculares de BCC: **Matriz Nova** e **Matriz Antiga**.
- Cards coloridos por núcleo de formação (Núcleo Básico, Núcleo de Computação, Optativa, Estágio, Outros).
- Estados de disciplina: `Pendente`, `Cursando` e `Concluído`.
- Grafo de pré-requisitos e liberações: ao selecionar ou passar o cursor sobre uma disciplina, setas conectam a disciplina com seus pré-requisitos e com as matérias que ela desbloqueia.
- Barra de estatísticas e progresso:
  - Percentual de integralização curricular (com base em 3.200h totais para BCC);
  - Carga horária cumprida em disciplinas obrigatórias e optativas;
  - Contabilização manual de horas de ACEX (máximo 320h) e ACC (máximo 90h);
  - Registro opcional da nota final obtida em cada disciplina concluída.

### 4.4. Catálogo de Disciplinas
- Busca global e filtros combinados por período letivo e modalidade (Obrigatória / Optativa).
- Exibição de cartões com código acadêmico, carga horária total e divisão entre horas teóricas, práticas e de extensão.
- Acesso à ementa na íntegra e detalhamento dos conteúdos por tópico.

### 4.5. Painel de Administração e Extração Inteligente
- Ferramenta de produtividade para coordenadores e estudantes:
  - Upload drag-and-drop de arquivos PDF oficiais com os horários divulgados pela UFAPE.
  - Processamento via Gemini API com prompt estruturado para reconhecimento das turmas, códigos, docentes, dias e adaptação aos blocos de horário oficiais.
  - Tela de conferência e edição manual das matérias extraídas antes da persistência.
  - Exportação direta para arquivo JSON ou salvamento no servidor de cursos customizados.

---

## 5. Limitações Conhecidas e Decisões de Escopo Atual
1. **Matriz Curricular Interativa:** Atualmente implementada em profundidade para Ciência da Computação (BCC), devido à complexidade da malha de pré-requisitos e equivalências. Os demais cursos possuem catálogo e horários funcionais.
2. **Ambiente de Produção do Painel Admin:** A rota do painel de administração (`/admin`) fica oculta quando a aplicação está em produção no domínio `bcc-ufape.vercel.app`, sendo habilitada em ambiente local ou via credencial/variável de ambiente.
3. **Persistência Sem Backend Obrigatório:** O sistema foi projetado para operar inteiramente no lado do cliente (Client-Side) utilizando armazenamento local para que o aluno não dependa de servidores externos ou contas para guardar seu plano de estudos.
