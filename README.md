# My UFAPE

Aplicação web da UFAPE para consultar disciplinas e matrizes curriculares, planejar horários e acompanhar o progresso acadêmico. A interface usa React e TypeScript; o servidor Express oferece a API acadêmica e os fluxos administrativos.

## Funcionalidades

- Planejamento de turmas por curso e semestre, com detecção de conflitos.
- Catálogo de disciplinas e matriz curricular com perfis, pré-requisitos e progresso local.
- Backup e restauração das preferências e do progresso do navegador.
- Painel administrativo autenticado pelo Supabase Auth para editar os dados publicados e revisar extrações.
- Extração assistida por IA com revisão humana obrigatória antes de publicar os dados.

## Autor e feedback

Desenvolvido por [Alex Lopes](https://github.com/alexlsilva7). O código está disponível no [repositório GitHub](https://github.com/alexlsilva7/grade_academica_app).

O rodapé da página inicial e o menu **Mais opções** das telas públicas oferecem **Enviar feedback**, o link do repositório e o perfil do autor. O formulário recebe sugestões, problemas, correções de dados acadêmicos e outros relatos sem exigir login. Nome e e-mail são opcionais. As mensagens são privadas e ficam no Supabase, na tabela `site_feedback`.

O contexto técnico é coletado automaticamente em todos os envios, sem opção ou prévia no formulário. A API exige tela, dispositivo, família do navegador, tamanho da tela, tema e versão do site; curso, semestre e perfil são incluídos quando selecionados. A URL completa, IP bruto, notas, progresso, horário pessoal e credenciais não são gravados com a mensagem. O contexto é fornecido pelo cliente e serve para diagnóstico, não para identificar ou autorizar usuários. Registros antigos sem contexto continuam consultáveis.

O envio usa `POST /api/feedback`, com limites de tamanho e validação no servidor. Uma função transacional no Supabase aceita no máximo cinco mensagens por origem em uma janela de 15 minutos e evita duplicatas quando o mesmo envio é repetido após uma falha de conexão. O controle utiliza HMAC diário do IP em uma tabela separada, sem guardar o IP bruto, e limpa entradas com mais de 24 horas na próxima submissão. Em Vercel, considera apenas `x-vercel-forwarded-for`; em servidores diretos, usa o endereço da conexão. Servidores atrás de outros proxies precisam de uma configuração confiável de origem antes de expor esse endpoint. A proteção é um limite básico de abuso; não exige CAPTCHA.

A seção **Feedbacks** no painel administrativo permite consultar mensagens de todos os cursos, filtrar por tipo/curso/situação, paginar, alterar a situação e escrever notas internas. `GET /api/admin/feedback` e `PATCH /api/admin/feedback/:id` exigem a autenticação administrativa existente. As tabelas e a função de envio são inacessíveis diretamente aos papéis `anon` e `authenticated`; somente a API com a chave secreta acessa esses dados. Salvar notas não envia e-mail.

A migração `site_feedback` deve estar aplicada no Supabase. O projeto usa as variáveis Supabase já existentes, sem novas credenciais obrigatórias. A versão do site nos relatos usa o commit da Vercel quando disponível, ou a data do build local. Os testes de permissões, idempotência e controle de envios estão em `supabase/tests/site_feedback_security.test.sql` e rodam com pgTAP no ambiente de testes.

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
| Calendário acadêmico | `/calendario` |
| Administração | `/admin` |

Curso, semestre e perfil são validados. Um semestre não publicado é substituído por uma opção disponível; curso ou caminho desconhecido retorna ao início. O servidor mantém a autenticação administrativa nas APIs mesmo que alguém abra `/admin` diretamente. Em produção, o Express serve `index.html` como fallback para as rotas da SPA.

## Progresso e backups

Preferências, horário montado e progresso acadêmico ficam no `localStorage` do navegador. Disciplinas concluídas usam uma lista por curso (`completedDisciplines_<curso>`), compartilhada pela matriz e montagem de horário em todos os perfis e semestres. A correspondência usa o código da disciplina, sem alterar zeros ou pontuação; disciplinas sem código mantêm a marcação pelo ID dentro do perfil. Notas e horas de ACEX/ACC continuam separadas por curso e perfil. Marcações antigas são migradas automaticamente, e o backup inclui as novas chaves. A restauração ignora credenciais e outras chaves que não pertencem ao My UFAPE. Os dados acadêmicos publicados continuam no Supabase.

Os cartões genéricos de optativas permitem escolher uma disciplina do catálogo do perfil ou informar nome e carga horária manualmente. A escolha mantém o status atual e usa as horas reais da disciplina; apenas cartões concluídos contribuem para o progresso. Também é possível adicionar optativas no último período, editar ou remover esses registros. As escolhas são pessoais, separadas por curso/perfil e incluídas tanto no backup geral quanto nas opções de exportação/importação do progresso do perfil, disponíveis em **Mais opções** na matriz. Limpar o progresso remove as escolhas e as optativas adicionais.

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

## Calendário acadêmico da UFAPE

O botão **Calendário acadêmico** da home abre `/calendario`, com imagens das páginas do documento oficial em um leitor dentro do site. A seleção usa `America/Sao_Paulo`: setembro de 2026 abre a página 8; outubro abre a 9. Antes ou depois da cobertura desta edição, abre a primeira ou a última tabela disponível. O PDF original continua disponível para download.

As 16 páginas são extraídas para WebP em três larguras (800, 1600 e 2400 pixels). Apenas a página selecionada é carregada, e `srcset` escolhe a resolução conforme a tela e o zoom. O leitor oferece páginas anterior/próxima, seleção direta, zoom de 100% a 400%, ajuste à largura e retorno ao mês atual. No celular, permite pinça com dois dedos e arraste; no computador, arraste, duplo clique, Ctrl/Command + roda e teclas `+`, `-` e `0` com o leitor focado. O zoom mantém o ponto sob os dedos/cursor. A navegação manual é preservada durante o mesmo mês; a mudança de mês atualiza a página automaticamente. Há indicador de carregamento e nova tentativa em caso de falha. O Vite ignora `public/documents` no monitoramento de arquivos para evitar erros EBUSY no Windows.

Ao substituir a edição, atualize o PDF em `public/documents`, revise o mapeamento em `src/utils/academicCalendarPdf.ts` e execute `python scripts/renderAcademicCalendar.py` com Pillow e Poppler instalados. No Windows, se Poppler não estiver no PATH, passe `--poppler-dir "caminho/para/Library/bin"`. O script gera os arquivos em `public/documents/calendario-academico-ufape-2026` e o índice em `src/data/academicCalendarImages.ts`. A extração ocorre antes da publicação; o site não precisa executar Python nem processar PDFs.

O calendário funciona sem API, importação de JSON ou armazenamento no Supabase. Para atualizar o documento, substitua o PDF estático e revise o mapeamento das páginas. As migrações registram a criação histórica e a remoção da antiga tabela de calendário em JSON.
