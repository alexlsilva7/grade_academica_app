# 12 - Persistência de Dados e Sistema de Backup

Este documento cataloga todos os itens armazenados localmente no navegador pelo **My UFAPE**, a estrutura do arquivo de backup gerado e como implementar a persistência compatível em **Flutter**.

---

## 1. Inventário de Chaves de Armazenamento Local

A aplicação atual armazena 16 chaves principais no `localStorage` do navegador:

| Chave | Tipo de Conteúdo | Descrição e Exemplo de Conteúdo |
| :--- | :--- | :--- |
| `selectedCourse` | `string` ou `null` | Sigla do curso selecionado pelo usuário (ex: `"bcc"`, `"eal"`, `"adm"`). |
| `themePreference` | `string` | Preferência de tema salva: `"light"`, `"dark"` ou `"system"`. |
| `view_preference` | `string` | Última tela acessada: `"home"`, `"schedule"`, `"matriz"`, `"disciplines"`, `"admin"`. |
| `saved_gradeTitle` | `string` | Título da grade horária em exibição (ex: `"BCC 2026.1"`). |
| `saved_selectedPeriod` | `string` (numérico) | Número do período atualmente filtrado na sidebar (ex: `"1"`). |
| `saved_disciplinesList` | `string` (JSON) | Array serializado de todas as disciplinas da grade carregada no momento. |
| `schedule_bcc` | `string` (JSON) | Array serializado de disciplinas adicionadas à grade de Ciência da Computação. |
| `schedule_eal` | `string` (JSON) | Array serializado de disciplinas adicionadas à grade de Engenharia de Alimentos. |
| `schedule_adm` | `string` (JSON) | Array serializado de disciplinas adicionadas à grade de Administração. |
| `completedDisciplines` | `string` (JSON) | Array de strings com os IDs/códigos das matérias que o aluno já concluiu (ex: `["CCMP3057", "log_mat_1"]`). |
| `savedGrades` | `string` (JSON) | Array de grades customizadas salvas localmente pelo usuário (`[{id, title, disciplines}]`). |
| `bcc_matriz_progress` | `string` (JSON) | Array serializado do progresso da **Matriz Nova** de BCC com status e notas (`Subject[]`). |
| `bcc_matriz_progress_antiga` | `string` (JSON) | Array serializado do progresso da **Matriz Antiga** de BCC (`Subject[]`). |
| `bcc_matrix_version` | `string` | Versão ativa da matriz no visualizador: `"nova"` ou `"antiga"`. |
| `bcc_acex_hours` | `string` (numérico) | Quantidade de horas de Atividades Curriculares de Extensão cumpridas (ex: `"120"`). |
| `bcc_acc_hours` | `string` (numérico) | Quantidade de horas de Atividades Complementares cumpridas (ex: `"45"`). |

---

## 2. Estrutura do Arquivo de Backup (`my_ufape_backup.json`)

Ao clicar no botão de download de backup na Home, o sistema coleta as 13 chaves principais de dados e empacota em um único arquivo JSON.

### 2.1. Exemplo do Arquivo de Backup
```json
{
  "themePreference": "dark",
  "selectedCourse": "bcc",
  "view_preference": "matriz",
  "saved_gradeTitle": "BCC - Bacharelado em Ciência da Computação - Período 2026.1",
  "saved_selectedPeriod": "1",
  "saved_disciplinesList": "[{\"id\":\"p1_1\",\"name\":\"Introdução à Programação I\",\"professor\":\"Renê\",\"period\":1,\"sessions\":[{\"day\":1,\"time\":\"18:30 - 20:10\"}]}]",
  "schedule_bcc": "[{\"id\":\"p1_1\",\"name\":\"Introdução à Programação I\",\"professor\":\"Renê\",\"period\":1,\"sessions\":[{\"day\":1,\"time\":\"18:30 - 20:10\"}]}]",
  "schedule_eal": "[]",
  "completedDisciplines": "[\"CCMP3057\",\"MATM3008\"]",
  "savedGrades": "[]",
  "bcc_matriz_progress": "[{\"id\":\"intro_prog_1\",\"code\":\"CCMP3057\",\"name\":\"Introdução à Programação I\",\"hours\":90,\"period\":1,\"type\":\"computacao\",\"prereqs\":[],\"desc\":\"...\",\"status\":\"concluido\",\"grade\":\"9.5\"}]",
  "bcc_acex_hours": "120",
  "bcc_acc_hours": "45"
}
```

> **Atenção:** Como o `localStorage` armazena exclusivamente strings, os campos contendo listas ou objetos estão salvos como strings JSON dentro do JSON. A versão em Flutter deve aceitar tanto strings JSON quanto objetos decodificados diretamente para garantir máxima interoperabilidade.

---

## 3. Rotinas de Exportação e Importação de Backup

### 3.1. Algoritmo de Exportação
1. Define a lista de chaves monitoradas.
2. Cria um mapa chave-valor `data: Map<String, dynamic>`.
3. Para cada chave, lê o valor atual no armazenamento local e adiciona ao mapa.
4. Serializa o mapa em uma string JSON formatada (`indent: '  '`).
5. No Web: dispara criação de link `<a>` com `data:text/json;charset=utf-8,...` e atributo `download="my_ufape_backup.json"`.
6. No Mobile/Desktop: salva o arquivo usando `file_picker` ou `path_provider` + `share_plus`.

### 3.2. Algoritmo de Importação e Restauração
1. O usuário seleciona o arquivo `.json` via seletor de arquivos.
2. Lê o conteúdo como string UTF-8.
3. Executa o parse JSON:
   - Se falhar ou o resultado não for um objeto/mapa, exibe erro: `"Formato de arquivo de backup inválido."`.
4. Para cada chave presente no arquivo importado:
   - Se o valor não for nulo, grava no armazenamento local.
   - Se for nulo, remove a chave correspondente.
5. Emite mensagem de sucesso ao usuário.
6. Notifica os controladores/gerenciadores de estado para recarregar todos os dados em memória.

---

## 4. Implementação Recomendada no Flutter

No ecossistema Flutter, a biblioteca recomendada para armazenar essas chaves é **`shared_preferences`**:

```dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  static const List<String> backupKeys = [
    'themePreference',
    'selectedCourse',
    'view_preference',
    'saved_gradeTitle',
    'saved_selectedPeriod',
    'saved_disciplinesList',
    'schedule_bcc',
    'schedule_eal',
    'schedule_adm',
    'completedDisciplines',
    'savedGrades',
    'bcc_matriz_progress',
    'bcc_matriz_progress_antiga',
    'bcc_matrix_version',
    'bcc_acex_hours',
    'bcc_acc_hours'
  ];

  Future<String> exportBackupJson() async {
    final prefs = await SharedPreferences.getInstance();
    final Map<String, dynamic> backup = {};

    for (final key in backupKeys) {
      backup[key] = prefs.getString(key);
    }

    return const JsonEncoder.withIndent('  ').convert(backup);
  }

  Future<bool> importBackupJson(String jsonString) async {
    try {
      final decoded = jsonDecode(jsonString);
      if (decoded is! Map<String, dynamic>) return false;

      final prefs = await SharedPreferences.getInstance();

      for (final entry in decoded.entries) {
        if (entry.value != null) {
          // Garante que o valor seja persistido como string para compatibilidade
          final stringVal = entry.value is String 
              ? entry.value as String 
              : jsonEncode(entry.value);
          await prefs.setString(entry.key, stringVal);
        } else {
          await prefs.remove(entry.key);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
```
Com essa implementação, um aluno que usava a versão web do My UFAPE poderá restaurar seu backup sem nenhuma perda de dados no novo aplicativo Flutter!
