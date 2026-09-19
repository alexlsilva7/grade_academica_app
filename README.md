# 🎓 My UFAPE

> Aplicativo web moderno e intuitivo para planejamento de grade horária, consulta de disciplinas e acompanhamento da matriz curricular na **Universidade Federal do Agreste de Pernambuco (UFAPE)**.

---

## 🌟 Funcionalidades

- **📅 Planejamento de Horário Letivo**:
  - Seleção interativa de turmas e disciplinas ofertadas no semestre.
  - Detecção visual e automática de **conflitos de horário (choques)**.
  - Quadro de horários semanal com divisões por dias e faixas de horários.
  - Resumo dinâmico da carga horária e total de créditos/disciplinas selecionadas.

- **📖 Catálogo de Disciplinas**:
  - Busca rápida por nome, código ou professor.
  - Filtros por período letivo e categoria (Obrigatórias e Optativas).
  - Modal com detalhes completos: ementa, pré-requisitos, equivalências e turmas.

- **🗂️ Matriz Curricular**:
  - Estrutura curricular organizada visualmente por períodos acadêmicos.
  - Consulta do fluxo de pré-requisitos e pré-requisitos diretos de cada matéria.

- **💾 Backup e Sincronização Local**:
  - Persistência automática das escolhas no navegador (`localStorage`).
  - Exportação e importação da grade e configurações em formato JSON.

- **🌓 Tema Claro / Escuro / Sistema**:
  - Suporte completo ao modo claro e escuro, com transição suave e respeito às preferências do sistema operacional.

---

## 🏛️ Cursos Suportados

Os dados de horários e currículos estão organizados de forma modular:

- **BCC** — Bacharelado em Ciência da Computação
- **ADM** — Bacharelado em Administração
- **EAL** — Bacharelado em Engenharia de Alimentos
- Suporte a inclusão e gerenciamento de novos cursos e semestres.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**:
  - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/) para empacotamento rápido
  - [Tailwind CSS v4](https://tailwindcss.com/) para estilização moderna e responsiva
  - [Lucide React](https://lucide.dev/) para ícones consistentes
  - [Motion](https://motion.dev/) para microinterações fluidas
- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
  - [@google/genai](https://www.npmjs.com/package/@google/genai) para utilitários de IA no painel administrativo

---

## 📁 Estrutura de Pastas

```text
├── src/
│   ├── components/         # Componentes da interface (Home, Grade, Disciplinas, Matriz, etc.)
│   ├── data/               # Dados dos cursos e semestres (JSONs estruturados)
│   │   ├── adm/            # Currículo e horários de Administração
│   │   ├── bcc/            # Currículo, ementas e horários de Ciência da Computação
│   │   └── eal/            # Horários de Engenharia de Alimentos
│   ├── hooks/              # Hooks customizados (gerenciamento de grade, tema, etc.)
│   ├── utils/              # Funções utilitárias (cálculo de choque, backup, etc.)
│   ├── types.ts            # Definições de tipos TypeScript
│   ├── main.tsx            # Ponto de entrada do React
│   └── App.tsx             # Componente raiz da aplicação
├── server.ts               # Servidor Express com integração Vite
├── metadata.json           # Metadados e permissões da aplicação
└── package.json            # Dependências e scripts do projeto
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- Gerenciador de pacotes **npm** (ou **pnpm** / **yarn**)

### Instalação

1. Clone o repositório ou faça o download dos arquivos:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd my-ufape
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente (opcional, para recursos com IA no painel administrativo):
   ```bash
   cp .env.example .env
   ```

4. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 📦 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com TypeScript (`tsx`) na porta 3000 |
| `npm run build` | Compila o bundle do frontend (`vite build`) e empacota o backend (`esbuild`) |
| `npm start` | Executa o servidor de produção compilado em `dist/server.cjs` |
| `npm run lint` | Valida a tipagem e erros no código com `tsc --noEmit` |

---

## 📄 Licença

Este projeto é desenvolvido para a comunidade acadêmica da **UFAPE**. Sinta-se à vontade para contribuir com melhorias, novos cursos ou correções nos horários e ementas!
