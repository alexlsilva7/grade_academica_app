# Configuração da extração

A extração agora funciona em uma única etapa: escolha o tipo de resultado, envie o documento e receba o JSON completo.

- Horários: turmas, professores, períodos, perfis e sessões.
- Catálogo curricular: disciplinas, cargas, créditos, ementas e relações.
- Matriz com pré-requisitos: os dados curriculares e o grafo com referências resolvidas.

Há apenas um modelo por extração. PDF/imagens usam Moonshot, OpenRouter ou Gemini; modelos NVIDIA de texto podem receber texto colado. As chaves permanecem no servidor. A lista de modelos mantém as opções já configuradas no projeto; a disponibilidade depende da conta e do provedor.

Todos os arquivos e o texto são enviados na mesma chamada de geração. O adaptador Moonshot ainda utiliza o serviço file-extract do próprio provedor para PDFs; OpenRouter utiliza seu parser de arquivos. Isso não cria etapas adicionais de geração no aplicativo. PDFs com relações visuais exigem um modelo com leitura visual adequada; o texto extraído por um parser pode não representar setas.

Não há configuração de leitor, inventário, detalhes, relações, reparo ou paralelismo. O campo legado pipeline pode continuar existindo em extrações antigas, mas não é utilizado pela geração atual. A validação e a montagem do grafo são locais. JSON inválido ou truncado gera erro; falhas transitórias podem repetir a mesma solicitação no mesmo modelo.

## Documento e resultado salvos

Antes de chamar o modelo, a interface salva o identificador no navegador e envia os arquivos ao servidor. Os documentos e a resposta validada ficam em .extraction-state/<identificador>/, fora do Git e do conteúdo servido pelo Vite. Fechar a página ou cancelar preserva os documentos.

Retomar extração reutiliza o documento salvo. Se ainda não houver resposta completa, a solicitação única é refeita. Reabrir resultado recupera a resposta final sem chamar a IA novamente. Não há resultados parciais de etapas para retomar. Resultados antigos já concluídos continuam disponíveis; respostas intermediárias antigas não são reutilizadas pelo novo fluxo.

Fluxo HTTP: POST /api/extraction-jobs recebe {token, mode, input}; GET /api/extraction-jobs/:token consulta a situação. As rotas de extração aceitam {resumeToken, model} ou arquivos diretamente. Os endpoints existentes permanecem compatíveis:

- POST /api/extract-schedule (e /api/extract-pdf): horários.
- POST /api/extract-curriculum: catálogo.
- POST /api/extract-curriculum-tree: matriz com pré-requisitos.

O relatório _extraction.calls registra a etapa extraction, o modelo e eventuais tentativas por falhas transitórias. O status checkpoint indica reutilização de uma resposta completa validada.

## Acompanhamento e logs

O painel de acompanhamento mostra eventos reais de Documento → Preparação → Extração com IA → Validação → Resultado. Essas fases descrevem o processamento da mesma solicitação; não adicionam etapas de geração por IA. O cronômetro informa apenas tempo decorrido. Não há percentual estimado nem mensagens alteradas por tempo.

O servidor publica os eventos em GET /api/extraction-jobs/:token, com Cache-Control: no-store. A interface consulta aproximadamente uma vez por segundo durante a execução, sem sobrepor consultas. Uma falha de acompanhamento preserva o último estado conhecido e aciona reconexão com espera progressiva. Não é tratada como falha da extração.

Cada evento tem ID crescente, horário, fase, nível e mensagem, com metadados de modelo, tentativa, duração, fontes, páginas, registros e pendências quando disponíveis. O estado e os últimos 200 eventos são gravados atomicamente em progress.json e restaurados ao reabrir o painel. O histórico não contém anexos, texto completo ou prompts; valores com formato de credenciais são ocultados. O painel permite filtrar avisos/erros e baixar os logs.

Estados: ready, running, complete, failed, cancelled e interrupted. Uma execução marcada como ativa antes de reiniciar o servidor aparece como interrupted; falha e cancelamento conservam o estágio em que aconteceram. A retomada abre uma nova tentativa com cronômetro próprio e mantém os eventos anteriores. O resultado só aparece como concluído depois de salvo no servidor. Metadados leves são usados pelo acompanhamento para não reler o Base64 dos documentos em cada consulta.
