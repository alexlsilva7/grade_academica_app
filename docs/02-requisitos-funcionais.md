# 02 - Especificação Funcional e Não Funcional

Este documento estabelece formalmente os **Requisitos Funcionais (RF)** e **Requisitos Não Funcionais (RNF)** do sistema **My UFAPE**.

---

## 1. Requisitos Funcionais (RF)

### 1.1. Gestão de Cursos e Navegação
- **RF01 - Seleção de Curso Ativo:**
  - O sistema deve permitir ao usuário selecionar seu curso de graduação dentre os cursos ofertados (Ciência da Computação, Engenharia de Alimentos, Administração).
  - O curso selecionado deve ser persistido localmente e permanecer ativo em sessões futuras até que o usuário decida alterá-lo.
  - Cursos ainda não implementados devem ser exibidos desabilitados com o indicativo "Em breve".
- **RF02 - Troca Dinâmica de Curso:**
  - O usuário deve poder alternar de curso a qualquer momento pela interface inicial ou cabeçalho.
  - Ao alternar de curso, as disciplinas da grade horária e do catálogo devem ser atualizadas para o curso correspondente.

### 1.2. Montagem e Planejamento da Grade Horária
- **RF03 - Carregamento de Grade Pré-definida:**
  - O sistema deve disponibilizar a grade horária oficial pré-carregada do semestre vigente para os cursos suportados.
  - As disciplinas devem ser agrupadas por período recomendado (1º ao 9º) e optativas (período 0).
- **RF04 - Filtragem e Busca de Disciplinas:**
  - A interface deve permitir buscar disciplinas por nome ou professor em tempo real.
  - A busca deve ser insensível a maiúsculas/minúsculas e acentuação gráfica (busca normalizada).
  - A filtragem pode ser combinada por período letivo.
- **RF05 - Adição e Remoção de Disciplinas na Grade:**
  - O usuário deve poder adicionar ou remover disciplinas da sua grade horária com um único clique ou toque.
  - As disciplinas adicionadas devem ser imediatamente plotadas nas respectivas células da grade semanal de horários (dia da semana e faixa de horário).
- **RF06 - Detecção em Tempo Real de Conflitos de Horário:**
  - O sistema deve calcular se há sobreposição temporal entre duas disciplinas adicionadas para o mesmo dia da semana.
  - Caso haja conflito, o sistema deve impedir a inclusão da disciplina conflitante, emitir um alerta visual (toast/banner) informando o nome da disciplina com a qual há o choque de horário.
  - Na lista lateral de disciplinas, qualquer matéria com horário conflitante com a grade atual deve exibir um badge de alerta indicando o conflito previamente.
- **RF07 - Tratamento de Disciplinas Sem Horário Definido:**
  - Disciplinas que não possuem sessões de horário cadastradas (ou horários a combinar) devem ser agrupadas em uma seção destacada no topo da tela de horários ("Sem Horário Definido"), permitindo remoção e consulta normalmente.
- **RF08 - Marcação de Disciplina como Concluída:**
  - O usuário deve poder marcar qualquer disciplina como "Concluída".
  - Ao marcar uma disciplina como concluída, ela deve ser automaticamente removida da grade horária corrente (caso esteja nela) e receber estilo visual diferenciado (tachada / cor verde).
  - A conclusão deve ser sincronizada com o status correspondente na Matriz Curricular.

### 1.3. Matriz Curricular e Progressão Acadêmica (BCC)
- **RF09 - Alternância de Versão da Matriz:**
  - O sistema deve permitir alternar entre a **Matriz Nova** e a **Matriz Antiga** do curso de BCC.
  - O progresso de cada matriz deve ser armazenado de maneira independente.
- **RF10 - Grafo de Pré-requisitos e Liberações:**
  - Ao selecionar ou passar o cursor sobre uma disciplina na matriz, o sistema deve desenhar setas de conexão conectando a matéria aos seus pré-requisitos imediatos e a todas as matérias que dependem dela.
  - Disciplinas bloqueadas por falta de cumprimento de pré-requisitos devem ser facilmente identificáveis.
- **RF11 - Gestão de Status da Disciplina na Matriz:**
  - Cada matéria na matriz curricular pode assumir um dos três status: `Pendente`, `Cursando` ou `Concluído`.
  - Se a disciplina estiver presente na grade horária do semestre e seu status for `Pendente`, ela deve ser exibida automaticamente como `Cursando`.
- **RF12 - Lançamento de Nota Final:**
  - Quando a disciplina estiver com o status `Concluído`, o sistema deve permitir ao usuário registrar sua nota final (de 0.0 a 10.0).
- **RF13 - Lançamento de Atividades Extracurriculares (ACEX e ACC):**
  - O sistema deve permitir ao usuário informar a quantidade de horas integralizadas em ACEX (Atividades Curriculares de Extensão, teto de 320 horas) e ACC (Atividades Complementares, teto de 90 horas).
- **RF14 - Cálculo de Integralização Curricular:**
  - O sistema deve computar em tempo real:
    - Carga horária cumprida em disciplinas obrigatórias;
    - Carga horária cumprida em disciplinas optativas;
    - Carga horária total acumulada (incluindo ACEX e ACC);
    - Percentual de conclusão do curso em relação à meta total de 3.200 horas.
- **RF15 - Reset e Reinicialização de Progresso:**
  - O sistema deve fornecer opção de resetar o progresso da matriz com diálogo de confirmação.

### 1.4. Catálogo de Disciplinas e Detalhes
- **RF16 - Consulta do Catálogo Completo:**
  - O usuário deve poder consultar todas as disciplinas do curso com paginação/rolagem contínua.
  - Filtros por período e por natureza (Obrigatória / Optativa).
- **RF17 - Modal de Detalhes da Disciplina:**
  - O sistema deve exibir modal contendo: código da disciplina, nome oficial, período recomendado, número de créditos, carga horária detalhada (teórica, prática, extensão e total), pré-requisitos, co-requisitos, equivalências acadêmicas, ementa e tópicos do conteúdo programático.

### 1.5. Persistência, Backup e Restauração
- **RF18 - Exportação Completa de Dados:**
  - O sistema deve permitir exportar um arquivo JSON (`my_ufape_backup.json`) contendo todas as preferências, seleções de cursos, grades horárias salvas, disciplinas concluídas, progresso da matriz e horas extracurriculares.
- **RF19 - Importação e Restauração de Dados:**
  - O sistema deve permitir selecionar um arquivo de backup previamente exportado e restaurar o estado completo da aplicação de maneira consistente.

### 1.6. Extração Automatizada com IA (Painel Admin)
- **RF20 - Upload de PDF de Horário Letivo:**
  - O sistema deve permitir o upload de arquivos PDF de horários acadêmicos da UFAPE via seleção de arquivo ou arrastar e soltar (drag & drop).
- **RF21 - Extração de Disciplinas via Gemini:**
  - O backend deve enviar o documento PDF para a API do Google Gemini com prompt e schema estruturado, extraindo turmas, códigos, docentes, períodos e sessões com mapeamento para os 4 blocos de horário oficiais.
- **RF22 - Revisão e Edição dos Dados Extraídos:**
  - O painel deve fornecer interface para revisar as disciplinas extraídas, alterar nomes, códigos, docentes, períodos e manipular sessões de horários antes de salvar.
- **RF23 - Gestão de Cursos Customizados:**
  - O usuário deve poder salvar a grade extraída como um novo curso ou atualizar um curso existente no backend local.

---

## 2. Requisitos Não Funcionais (RNF)

- **RNF01 - Responsividade e Multiplataforma:**
  - A interface deve se adaptar perfeitamente a dispositivos móveis (smartphones com telas a partir de 360px de largura), tablets e monitores desktop.
  - No mobile, a navegação entre a lista de disciplinas e a grade horária deve utilizar abas dedicadas (`MobileNav`).
- **RNF02 - Suporte a Temas (Claro, Escuro e Sistema):**
  - O sistema deve suportar Modo Claro, Modo Escuro e Modo Sistema (acompanhando o sistema operacional do usuário).
  - A escolha deve ser persistida e não apresentar "piscos" (flicker) durante a inicialização.
- **RNF03 - Disponibilidade Offline:**
  - Todas as funcionalidades de consulta de disciplinas, horários pré-carregados, montagem de grade e matriz curricular devem funcionar offline sem dependência de internet.
- **RNF04 - Performance e Renderização do Grafo:**
  - A renderização das conexões de pré-requisitos na matriz curricular deve ser fluida (60 FPS), recalculando coordenadas durante eventos de resize ou scroll sem engasgos.
- **RNF05 - Privacidade dos Dados do Usuário:**
  - Nenhum dado pessoal, nota ou histórico de grade do discente deve ser enviado para servidores externos para armazenamento persistente; todos os dados pertencem ao usuário e ficam no dispositivo.
- **RNF06 - Internacionalização e Localização:**
  - O sistema deve estar completamente em Português do Brasil (pt-BR), incluindo terminologias acadêmicas adotadas na UFAPE.
- **RNF07 - Tratamento Resiliente de Erros:**
  - Falhas na extração de PDFs ou na leitura de arquivos JSON de backup corrompidos devem exibir mensagens de erro explicativas ao usuário, sem travamento da aplicação.
- **RNF08 - Paridade e Compatibilidade de Dados:**
  - Os formatos de arquivos e JSONs gerados pela nova versão em Flutter devem ser 100% retrocompatíveis com os arquivos de backup gerados na versão React.
