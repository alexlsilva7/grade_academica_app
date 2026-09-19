# Pacote de Engenharia Reversa e Especificação Técnica - My UFAPE

Este diretório reúne o pacote completo de engenharia reversa, especificação técnica de requisitos, modelos de domínio, esquemas de dados, regras de negócio e guia de migração para **Flutter (Dart)** do aplicativo **My UFAPE**.

---

## Sumário dos Documentos

| Arquivo | Tópico | Descrição |
| :--- | :--- | :--- |
| [`01-visao-geral.md`](./01-visao-geral.md) | **Visão Geral / PRD** | Propósito, público-alvo, cursos suportados, proposta de valor e escopo. |
| [`02-requisitos-funcionais.md`](./02-requisitos-funcionais.md) | **Requisitos do Sistema** | Especificação dos Requisitos Funcionais (RF01 a RF23) e Não Funcionais (RNF01 a RNF08). |
| [`03-inventario-funcionalidades.md`](./03-inventario-funcionalidades.md) | **Inventário de Funcionalidades** | Tabela de rastreamento com todas as funcionalidades e mapeamento de código original. |
| [`04-telas-componentes.md`](./04-telas-componentes.md) | **Telas e Componentes** | Especificação detalhada de cada tela, props, estados internos e equivalentes Flutter. |
| [`05-fluxos-usuario.md`](./05-fluxos-usuario.md) | **Fluxos de Navegação** | Diagramas de fluxo em formato Mermaid (navegação, grade, conflito, matriz, IA). |
| [`06-modelo-dominio.md`](./06-modelo-dominio.md) | **Modelo de Domínio** | Diagrama de classes do domínio, entidades, objetos de valor e enums. |
| [`07-dicionario-dados.md`](./07-dicionario-dados.md) | **Dicionário de Dados** | Catálogo exaustivo de campos, tipos primitivos, restrições e regras de validação. |
| [`08-json-schemas/`](./08-json-schemas/) | **Contratos de Dados (Schemas)** | Schemas JSON Schema Draft-07 para horários, currículos, conteúdos e backups. |
| [`09-openapi.yaml`](./09-openapi.yaml) | **Especificação OpenAPI 3.0** | Contratos de API para verificação de saúde, cursos customizados e extração PDF via IA. |
| [`10-regras-negocio-algoritmos.md`](./10-regras-negocio-algoritmos.md) | **Regras e Algoritmos** | Conflito de horário, pré-requisitos, ACEX/ACC, curvas Bézier e normalização IA. |
| [`11-arquitetura.md`](./11-arquitetura.md) | **Arquitetura de Software** | Comparação Legado vs. Novo, arquitetura em camadas e diagramas C4 (Níveis 1 e 2). |
| [`12-persistencia-backup.md`](./12-persistencia-backup.md) | **Persistência e Backup** | Inventário de chaves locais, formato do arquivo de backup e rotinas de restauração. |
| [`13-integracao-ia-pdf.md`](./13-integracao-ia-pdf.md) | **Integração com IA (Gemini)** | Prompt especializado de sistema, schemas de resposta e chamada em Dart/Flutter. |
| [`14-matriz-rastreabilidade.md`](./14-matriz-rastreabilidade.md) | **Matriz de Rastreabilidade** | Mapeamento ponta a ponta: RF $\rightarrow$ Tela $\rightarrow$ Componente $\rightarrow$ Regra $\rightarrow$ Dados. |
| [`15-plano-testes.md`](./15-plano-testes.md) | **Plano de Testes** | Casos de teste de unidade em Dart (`package:test`), testes de widget e aceitação. |
| [`16-guia-migracao-flutter.md`](./16-guia-migracao-flutter.md) | **Guia Técnico de Migração** | `pubspec.yaml`, modelos Dart, controller de estado, `CustomPainter` e mapa React $\rightarrow$ Flutter. |
| [`17-manual-usuario.md`](./17-manual-usuario.md) | **Manual do Usuário** | Guia prático passo a passo de utilização do sistema para o aluno da UFAPE. |
| [`18-glossario.md`](./18-glossario.md) | **Glossário** | Definições de termos acadêmicos da UFAPE e termos técnicos de software. |
