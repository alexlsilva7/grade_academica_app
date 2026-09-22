# Extração de documentos acadêmicos

Os quatro endpoints de extração utilizam `extractionPipeline.ts`. A validação de domínio e a conversão árvore → catálogo ficam em `src/utils/extraction.ts`.

A extração tem uma única etapa de IA: documento + tipo desejado → JSON completo. Veja também [Configuração da extração](pipeline-configuravel.md).

## Entrada

Todos os modos aceitam `files: [{ fileName, mimeType, base64Data }]`, `textContent` e `model`. Arquivos e texto podem ser enviados juntos. O formato antigo `base64Data` + `mimeType` continua aceito. Cada arquivo recebe um índice para distinguir nomes repetidos.

Formatos: PDF, PNG, JPEG e WEBP. Máximo de 20 arquivos e limite HTTP de 50 MB, incluindo Base64. PDFs inválidos ou protegidos que não possam ser abertos retornam erro, sem aplicar resultados parciais.

## Extração única

O usuário escolhe horários, catálogo curricular ou matriz com pré-requisitos, seleciona um modelo e envia PDF, imagens e/ou texto. Todos os documentos são enviados juntos, sem recortes, inventário, leitor por página ou lotes de disciplinas. Uma única chamada de geração retorna todos os campos do modo selecionado, incluindo detalhes, relações e perfis.

O servidor valida o JSON e as evidências, consolida registros e resolve as referências do grafo localmente, sem chamar outro modelo. A interface abre o editor JSON ao concluir; copiar e baixar preservam também a árvore, os perfis e o relatório quando disponíveis. A revisão e a gravação no curso continuam disponíveis.

Modelos que aceitam arquivos podem ser selecionados no modo de upload. Os modelos NVIDIA de texto ficam disponíveis para texto colado. Configurações antigas de modelos por etapa não alteram o novo fluxo.

## Fidelidade e evidências

- Dados ausentes, ilegíveis ou ambíguos permanecem `null`. Zero e lista vazia representam ausência documentada.
- Códigos oficiais nunca são sintetizados. IDs internos são gerados pelo servidor.
- Créditos não são calculados pelas horas. A divisão teórica/prática/extensão não é inferida.
- Optativas conservam o perfil; período desconhecido não vira zero.
- Cada registro inclui `evidence: [{ field, file, page, excerpt }]`. Páginas começam em 1 na fonte original; texto colado usa `page: null`.
- Referências a arquivos/páginas inexistentes são descartadas. Valores sem referência válida viram `null` com pendência.
- Divergências conservam as evidências disponíveis. Referências e transcrições são produzidas pela IA e precisam de conferência no original: validação estrutural não comprova exatidão.

## Revisão e persistência

A resposta contém `subjects` ou `disciplines`, perfis, `_modelUsed` e `_extraction` (fontes, etapas, pendências e evidências de metadados). O administrador mostra pendências e trechos por campo. Campos numéricos vazios continuam desconhecidos ao abrir/salvar editores. O total de horas é editado separadamente.

A gravação revalida os dados no servidor e rejeita erros de domínio; avisos de informação ausente permitem salvar um catálogo incompleto. Evidências ficam nos registros; o relatório curricular fica em `extraction`, e o relatório de horários em `extracao_horario_*.json`. `treeSubjects` preserva a árvore sem perfil identificado.

## Limites e falhas

Respostas vazias, truncadas ou incompatíveis com o schema interrompem a extração. Não há uma segunda chamada para corrigir JSON. Erros transitórios (429, 5xx e timeout) recebem até três novas tentativas da mesma solicitação e do mesmo modelo, respeitando Retry-After. Cancelar interrompe a espera e encaminha o sinal ao SDK. Cada chamada tem timeout de 180 segundos.

O documento completo precisa caber no contexto e no limite de saída do modelo escolhido. Um resultado truncado gera erro, sem aplicar um JSON parcial. A validação estrutural não garante que todas as informações da fonte foram extraídas.

## Verificação

`npm test` usa respostas simuladas do provedor para testar múltiplos arquivos, divisão de PDFs, referências, conflitos, dados ausentes, conversão de pré-requisitos, ciclos e truncamento. `npm run lint` verifica tipos e `npm run build` gera os bundles. A avaliação de precisão com documentos reais revisados é uma etapa separada.
