# 15 - Plano de Testes e Casos de Teste

Este documento define os casos de teste essenciais para garantir que a reimplementação do **My UFAPE** em **Flutter** alcance **100% de paridade funcional** e opere livre de regressões.

---

## 1. Casos de Teste de Unidade (Lógica de Negócio)

Os testes de unidade devem ser escritos em Dart utilizando o pacote oficial `package:test`.

### 1.1. Detecção de Conflito de Horário (`check_schedule_conflict_test.dart`)

```dart
import 'package:test/test.dart';

void main() {
  group('Algoritmo de Conflito de Horários', () {
    test('Não deve detectar conflito para disciplinas em dias diferentes', () {
      final sessaoSegunda = Session(day: 1, time: '18:30 - 20:10');
      final sessaoTerca = Session(day: 2, time: '18:30 - 20:10');
      
      expect(hasConflict(sessaoSegunda, sessaoTerca), isFalse);
    });

    test('Deve detectar conflito para disciplinas no mesmo dia e mesmo horário', () {
      final sessaoA = Session(day: 1, time: '18:30 - 20:10');
      final sessaoB = Session(day: 1, time: '18:30 - 20:10');
      
      expect(hasConflict(sessaoA, sessaoB), isTrue);
    });

    test('Não deve detectar conflito para horários estritamente adjacentes', () {
      // 18:30 - 20:10 termina exatamente quando 20:10 - 21:50 inicia
      final sessaoA = Session(day: 1, time: '18:30 - 20:10');
      final sessaoB = Session(day: 1, time: '20:10 - 21:50');
      
      expect(hasConflict(sessaoA, sessaoB), isFalse);
    });

    test('Deve detectar conflito para sobreposições parciais', () {
      // Intervalo de 4h (14:00 - 18:00) colide com 16:00 - 18:00
      final sessaoA = Session(day: 3, time: '14:00 - 18:00');
      final sessaoB = Session(day: 3, time: '16:00 - 18:00');
      
      expect(hasConflict(sessaoA, sessaoB), isTrue);
    });
  });
}
```

### 1.2. Desbloqueio de Pré-requisitos na Matriz (`prerequisites_test.dart`)

```dart
import 'package:test/test.dart';

void main() {
  group('Desbloqueio de Pré-requisitos (isUnlocked)', () {
    test('Matéria sem pré-requisitos deve estar sempre desbloqueada', () {
      final subject = Subject(id: 'intro_prog_1', prereqs: [], status: 'pendente');
      expect(isUnlocked(subject, []), isTrue);
    });

    test('Matéria com pré-requisito pendente deve estar bloqueada', () {
      final prereq = Subject(id: 'intro_prog_1', prereqs: [], status: 'pendente');
      final target = Subject(id: 'aed_1', prereqs: ['intro_prog_1'], status: 'pendente');
      
      expect(isUnlocked(target, [prereq]), isFalse);
    });

    test('Matéria com todos os pré-requisitos concluídos deve estar desbloqueada', () {
      final prereq1 = Subject(id: 'aed_1', prereqs: [], status: 'concluido');
      final prereq2 = Subject(id: 'alg_lin', prereqs: [], status: 'concluido');
      final target = Subject(id: 'comp_graf', prereqs: ['aed_1', 'alg_lin'], status: 'pendente');
      
      expect(isUnlocked(target, [prereq1, prereq2]), isTrue);
    });

    test('Matéria com múltiplos pré-requisitos mas apenas um concluído deve estar bloqueada', () {
      final prereq1 = Subject(id: 'aed_1', prereqs: [], status: 'concluido');
      final prereq2 = Subject(id: 'alg_lin', prereqs: [], status: 'pendente');
      final target = Subject(id: 'comp_graf', prereqs: ['aed_1', 'alg_lin'], status: 'pendente');
      
      expect(isUnlocked(target, [prereq1, prereq2]), isFalse);
    });
  });
}
```

### 1.3. Cálculo de Carga Horária e Tetos Extracurriculares (`progress_calc_test.dart`)

```dart
import 'package:test/test.dart';

void main() {
  group('Cálculo de Progresso do BCC', () {
    test('Deve aplicar teto de 320h para ACEX mesmo se o aluno tiver mais', () {
      final stats = calculateProgress(
        subjects: [],
        acexHours: 400, // informou 400h
        accHours: 0
      );
      expect(stats.totalCompletedPlusExtracurricular, equals(320));
    });

    test('Deve aplicar teto de 90h para ACC mesmo se o aluno tiver mais', () {
      final stats = calculateProgress(
        subjects: [],
        acexHours: 0,
        accHours: 150 // informou 150h
      );
      expect(stats.totalCompletedPlusExtracurricular, equals(90));
    });

    test('Percentual deve atingir 100% ao completar 3200h e não ultrapassar', () {
      final stats = calculateProgress(
        completedRegularHours: 2800,
        completedOptativeHours: 0,
        acexHours: 320,
        accHours: 90
      );
      // 2800 + 320 + 90 = 3210h -> limitado a 100%
      expect(stats.progressPercent, equals(100.0));
    });
  });
}
```

---

## 2. Casos de Teste de Interface / Widget (`flutter_test`)

| ID | Cenário | Passos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **WT01** | Adição de disciplina à grade | 1. Abre a tela de Grade<br>2. Clica no card de "Introdução à Programação I"<br>3. Alterna para a aba do Grid | O bloco da matéria deve estar renderizado nas células de Segunda (18:30-20:10 e 20:10-21:50) e Terça (20:10-21:50). |
| **WT02** | Tentativa de adicionar com conflito | 1. Adiciona "Lógica Matemática I" (Qua 18:30-20:10)<br>2. Tenta adicionar outra matéria no mesmo horário | A segunda matéria não é adicionada; uma SnackBar/Toast de alerta vermelha aparece indicando o conflito com "Lógica Matemática I". |
| **WT03** | Marcar como concluída | 1. Na Sidebar, clica no ícone de check de "Lógica Matemática I" | A matéria recebe estilo riscado; caso estivesse na grade semanal, é imediatamente removida do Grid. |
| **WT04** | Abertura do modal de detalhes | 1. Clica no ícone de informação (i) em qualquer matéria | Abre o modal/bottom sheet exibindo ementa oficial, créditos e carga horária detalhada. |
| **WT05** | Alternância de Tema | 1. Clica no botão de tema no cabeçalho | O app alterna entre Modo Sistema $\rightarrow$ Claro $\rightarrow$ Escuro $\rightarrow$ Sistema, alterando o `ThemeMode` sem falhas visuais. |

---

## 3. Matriz de Testes de Aceitação do Usuário (UAT)

1. **Persistência ao reiniciar:** O usuário monta sua grade, fecha o app e reabre. A grade e o curso selecionado devem estar idênticos.
2. **Importação de backup legado:** O usuário pega o arquivo `my_ufape_backup.json` exportado da versão antiga React e importa no novo app Flutter. Todos os dados (disciplinas concluídas, notas, progresso) devem ser carregados perfeitamente.
3. **Extração de PDF real:** O usuário faz upload de um edital de horário letivo real em PDF da UFAPE. O app deve extrair corretamente as disciplinas e permitir revisão na tabela.
