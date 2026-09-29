# My UFAPE

Aplicação web da UFAPE para consultar disciplinas e matrizes curriculares, planejar horários e acompanhar o progresso acadêmico. A interface usa React e TypeScript; o servidor Express oferece a API acadêmica e os fluxos administrativos.

## Funcionalidades

- Planejamento de turmas por curso e semestre, com detecção de conflitos.
- Catálogo de disciplinas e matriz curricular com perfis, pré-requisitos e progresso local.
- Backup e restauração das preferências e do progresso do navegador.
- Painel administrativo autenticado pelo Supabase Auth para editar os dados publicados e revisar extrações.
- Extração assistida por IA com revisão humana obrigatória antes de publicar os dados.

## Dados acadêmicos

Os dados acadêmicos estão no **Supabase**. O servidor seleciona a fonte em `ACADEMIC_DATA_SOURCE`; use `supabase` para a instalação atual. `files` é um adaptador local legado para ambientes de desenvolvimento e não representa a fonte publicada. As migrações de esquema e as políticas SQL estão em `supabase/migrations` e `supabase/tests`.

Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` no ambiente apropriado. A chave secreta é exclusiva do servidor; não use o prefixo `VITE_` nela. O acesso administrativo também requer os UUIDs permitidos em `ADMIN_USER_IDS`. Consulte `.env.example` para a lista de variáveis. Não é necessário repetir a migração dos dados acadêmicos.

O servidor expõe `/api/courses` para metadados leves e `/api/courses/:id` para os detalhes solicitados. A listagem não baixa currículos nem horários completos. O parâmetro `include` permite pedir só `curriculum`, `schedule` e/ou `contents` necessários à tela; sem ele, o endpoint mantém o retorno completo para compatibilidade. A consulta de horário seleciona o semestre pedido ou resolve uma alternativa disponível.

## Rotas da aplicação

As telas principais aceitam links diretos e atualizam o histórico do navegador:

| Tela | Caminho |
|---|---|
| Início | `/` |
| Planejamento de horário | `/schedule?course=bcc&semester=2026.1&profile=BCC03` |
| Matriz curricular | `/matriz?course=eal&semester=2026.1&profile=EAL03` |
| Catálogo de disciplinas | `/disciplinas?course=eal&semester=2026.1` |
| Administração | `/admin` |

Curso, semestre e perfil são validados. Um semestre não publicado é substituído por uma opção disponível; curso ou caminho desconhecido retorna ao início. O servidor mantém a autenticação administrativa nas APIs mesmo que alguém abra `/admin` diretamente. Em produção, o Express serve `index.html` como fallback para as rotas da SPA.

## Progresso e backups

Preferências, horário montado e progresso acadêmico ficam no `localStorage` do navegador. O progresso de matriz, horas de ACEX/ACC e disciplinas concluídas é separado por curso e perfil. O backup inclui essas chaves da aplicação e a restauração ignora credenciais e outras chaves que não pertencem ao My UFAPE. Os dados acadêmicos publicados continuam no Supabase.

## Extração e retenção

As rotas de extração exigem sessão administrativa. Cada trabalho pertence ao UUID do administrador que o iniciou; tokens de outro administrador não permitem consultar ou retomar esse trabalho. Os documentos, checkpoints e resultados ficam em `.extraction-state` (ou em `EXTRACTION_STATE_DIR`) para permitir retomada após desconexão ou reinício. O servidor limita a duas extrações simultâneas por diretório e usa locks em arquivo para coordenar processos no mesmo host. Resultados extraídos voltam ao painel para revisão; a extração não publica dados automaticamente.

O armazenamento local é adequado para uma instância ou várias instâncias no mesmo host e com o mesmo diretório. Uma implantação em múltiplos hosts precisa de armazenamento e locks distribuídos; locks cujo host não pode ser verificado são preservados e falham de forma fechada. Documentos não são apagados automaticamente. Para revisar trabalhos parados há mais de 30 dias, execute primeiro a simulação:

```bash
npm run cleanup:extraction
```

Após revisar as contagens, a remoção explícita exige `--apply`:

```bash
npm run cleanup:extraction -- --older-than-days=30 --apply
```

O procedimento remove o diretório inteiro do trabalho, incluindo documento, checkpoints e resultado. Trabalhos ativos, dados recentes e pastas malformadas são preservados. Defina `EXTRACTION_STATE_DIR` para apontar a rotina ao mesmo diretório usado pelo servidor.

## Publicação na Vercel

Publique o repositório completo, com a raiz do projeto como **Root Directory**. O
`vercel.json` configura o build estático do Vite e encaminha `/api/*` à função
`api/index.ts`, que compartilha a API Express com o servidor local. As demais
rotas, como `/schedule` e `/matriz`, abrem a SPA. Enviar somente `dist/` não
publica a API e faz a seleção de cursos ficar sem dados.

Nas variáveis de ambiente da Vercel, configure `ACADEMIC_DATA_SOURCE=supabase`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`.
Para o painel administrativo, configure também `ADMIN_USER_IDS`. Aplique as
variáveis aos ambientes usados (Production e/ou Preview) e faça um novo deploy;
o arquivo `.env` local não é enviado. A chave secreta deve permanecer sem o
prefixo `VITE_`.

Após publicar, `/api/health` deve retornar JSON com `status: "ok"` e
`/api/courses` deve retornar a lista de cursos. O comando `build:vercel` gera
somente os arquivos públicos; o backend é empacotado como função pela Vercel.

As extrações com checkpoints locais exigem um servidor com armazenamento
persistente. O sistema de arquivos das funções da Vercel não oferece essa
persistência; use o servidor local para esse fluxo. Consulta e edição dos dados
acadêmicos no Supabase usam a API publicada normalmente.

## Desenvolvimento

Requer Node.js 18 ou superior e npm.

```bash
npm install
cp .env.example .env
npm run dev
```

O servidor de desenvolvimento inicia em `http://localhost:3000`. Preencha as variáveis Supabase para consultar os dados atuais. Não use dados ou credenciais de produção em testes locais.

### Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor Express e Vite em modo de desenvolvimento |
| `npm test` | Suíte automatizada |
| `npm run lint` | Checagem de tipos TypeScript |
| `npm run build` | Bundle do frontend e do servidor em `dist/` |
| `npm start` | Servidor de produção compilado |
| `npm run cleanup:extraction` | Simulação de limpeza de trabalhos expirados |

## Organização

```text
src/
  components/       Telas e componentes React
  hooks/            Estado da aplicação e fluxos de edição
  server/           Repositório acadêmico, autenticação e migração
  utils/            Rotas, progresso, backup e regras de domínio
supabase/
  migrations/       Esquema e migrações SQL
  tests/            Testes SQL de segurança dos dados
tests/              Testes automatizados TypeScript
extractionJobs.ts   Persistência local e retomada de extrações
extractionRoutes.ts API autenticada de extração
app.ts              API Express compartilhada
api/index.ts        Entrada da função na Vercel
server.ts           Servidor local e fallback da SPA
```
