# Prompts para extração em ferramentas de IA

Esta pasta contém versões portáveis dos prompts de extração do projeto. Os três
prompts principais são completos: copie o conteúdo de **um** deles e anexe os
documentos na ferramenta de IA que preferir. Não é necessário copiar este README.

| Objetivo | Prompt |
| --- | --- |
| Extrair turmas, professores e horários | [01-extrair-horarios.md](01-extrair-horarios.md) |
| Extrair catálogo, cargas, créditos e ementas do PPC | [02-extrair-curriculo.md](02-extrair-curriculo.md) |
| Extrair matriz com pré-requisitos a partir de PPC e fluxograma | [03-extrair-grafo.md](03-extrair-grafo.md) |

## Como usar

1. Escolha um prompt e copie todo o conteúdo do arquivo.
2. Anexe os PDFs/imagens ou cole o texto. Identifique cada fonte pelo nome do
   arquivo. Se houver nomes repetidos, use identificadores como `1: PPC.pdf`.
3. Informe o curso, perfil ou semestre que deseja analisar **como filtro**.
   Isso não substitui a evidência no documento.
4. Para PDFs recortados, informe quais são as páginas originais. Sem esse mapa,
   as referências devem usar o nome e a numeração do próprio recorte.
5. Salve a resposta como JSON e confira as pendências e evidências no original.

Os exemplos JSON dentro dos prompts são moldes de estrutura. Valores `null` e
listas vazias não são respostas previamente conhecidas sobre o documento.

## Documentos extensos: uso em etapas

Para um PPC extenso, extraia partes menores e mantenha os resultados intermediários:

1. [Inventariar seções](etapas/01-inventariar-secoes.md): localize tabelas,
   ementas, fluxogramas e páginas relevantes.
2. Use o prompt principal de currículo ou horários limitado às seções escolhidas.
   No currículo, você pode pedir apenas a identificação das disciplinas nesta
   primeira passagem, deixando os detalhes ainda não verificados como `null`.
3. [Detalhar disciplinas](etapas/02-detalhar-disciplinas.md): envie o catálogo
   anterior e as fontes, preferencialmente em lotes de até 12 disciplinas.
4. [Extrair relações](etapas/03-extrair-relacoes.md): envie o catálogo com os
   mesmos IDs, o PPC e o fluxograma.
5. [Revisar e consolidar](etapas/04-revisar-consolidar.md): una os resultados e
   confira divergências, possíveis omissões e relações entre disciplinas.

Em uma conversa nova, reenvie os documentos e JSONs necessários. Não presuma que
a ferramenta consegue acessar anexos de outra conversa. Se ela não interpretar
imagens/setas, use a extração textual e mantenha as relações visuais pendentes.

## Uso dos resultados no aplicativo

- **Horários:** o prompt produz `{ "disciplines": [...] }`. A edição JSON do
  Administrador também aceita diretamente o array de disciplinas.
- **Currículo:** o prompt produz `{ "subjects": [...] }`, no formato de catálogo
  usado pelo Administrador. Confira os dados antes de salvar.
- **Grafo:** o resultado usa nós com `prereqs` referenciando IDs. Não cole esse
  resultado na edição JSON do catálogo linear: ela não converte nós em disciplinas
  automaticamente. A importação externa completa de grafos e perfis exige adaptação.
- Evidências acompanham os registros. O relatório `issues` da ferramenta externa
  deve ser guardado junto com o JSON original; a edição JSON do Administrador não
  transforma esse relatório automaticamente no painel de revisão da extração interna.

## Manutenção

Estes arquivos são destinados ao uso manual em outras ferramentas. O servidor
continua utilizando os prompts e schemas de `extractionPipeline.ts`; editar esta
pasta não altera automaticamente o comportamento do aplicativo.

As regras seguem o fluxo implementado: não inventar dados acadêmicos, distinguir
desconhecido de zero/lista vazia, preservar perfis e turmas e registrar as fontes.
Uma resposta JSON bem formada ainda precisa de conferência no documento original.
