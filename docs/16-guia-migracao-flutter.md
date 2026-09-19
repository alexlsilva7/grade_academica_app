# 16 - Guia de Migração para Flutter (Dart)

Este guia prático fornece o roteiro técnico e código de referência em **Dart** e **Flutter** para reconstruir o aplicativo **My UFAPE** com rapidez, código limpo e paridade total com a versão web original.

---

## 1. Configuração do Projeto e Dependências (`pubspec.yaml`)

Crie o projeto Flutter executando:
```bash
flutter create --org br.edu.ufape my_ufape_app
```

No arquivo `pubspec.yaml`, configure as dependências essenciais:

```yaml
name: my_ufape_app
description: Assistente acadêmico para planejamento curricular na UFAPE.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # Gerenciamento de estado e injeção
  provider: ^6.1.1 # ou flutter_riverpod: ^2.5.1
  
  # Armazenamento e persistência local
  shared_preferences: ^2.2.2
  
  # Tipografia moderna do Google Fonts (Inter / Roboto)
  google_fonts: ^6.1.0
  
  # Ícones semelhantes aos do Lucide
  lucide_icons: ^0.257.0
  
  # Manipulação de arquivos e backups
  file_picker: ^8.0.0
  path_provider: ^2.1.2
  share_plus: ^7.2.2
  
  # Inteligência Artificial / Extração de PDF
  google_generative_ai: ^0.4.0
  
  # Requisições HTTP (caso utilize backend dedicado)
  http: ^1.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  test: ^1.24.9

flutter:
  uses-material-design: true
  assets:
    - assets/data/bcc/
    - assets/data/adm/
    - assets/data/eal/
    - assets/images/
```

Copie os arquivos JSON existentes em `src/data/` diretamente para a pasta `assets/data/` do projeto Flutter.

---

## 2. Modelos de Dados em Dart com `fromJson` e `toJson`

### 2.1. `Session` e `Discipline` (`lib/data/models/discipline_model.dart`)

```dart
class Session {
  final int day; // 1 = Segunda, ..., 6 = Sábado
  final String time;

  Session({required this.day, required this.time});

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      day: json['day'] as int,
      time: json['time'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'day': day,
    'time': time,
  };
}

class Discipline {
  final String id;
  final String? code;
  final String name;
  final String professor;
  final int period;
  final List<Session> sessions;

  Discipline({
    required this.id,
    this.code,
    required this.name,
    required this.professor,
    required this.period,
    required this.sessions,
  });

  factory Discipline.fromJson(Map<String, dynamic> json) {
    return Discipline(
      id: json['id'] as String,
      code: json['code'] as String?,
      name: json['name'] as String,
      professor: json['professor'] as String? ?? '-',
      period: json['period'] as int? ?? 0,
      sessions: (json['sessions'] as List<dynamic>?)
              ?.map((s) => Session.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    if (code != null) 'code': code,
    'name': name,
    'professor': professor,
    'period': period,
    'sessions': sessions.map((s) => s.toJson()).toList(),
  };
}
```

### 2.2. `Subject` da Matriz Curricular (`lib/data/models/subject_model.dart`)

```dart
enum SubjectStatus { pendente, cursando, concluido }

class Subject {
  final String id;
  final String? code;
  final String name;
  final int hours;
  final int period;
  final String type;
  final List<String> prereqs;
  final String desc;
  SubjectStatus status;
  String grade;

  Subject({
    required this.id,
    this.code,
    required this.name,
    required this.hours,
    required this.period,
    required this.type,
    required this.prereqs,
    required this.desc,
    this.status = SubjectStatus.pendente,
    this.grade = '',
  });

  factory Subject.fromJson(Map<String, dynamic> json) {
    SubjectStatus parsedStatus = SubjectStatus.pendente;
    final statusStr = json['status'] as String?;
    if (statusStr == 'cursando') parsedStatus = SubjectStatus.cursando;
    if (statusStr == 'concluido') parsedStatus = SubjectStatus.concluido;

    return Subject(
      id: json['id'] as String,
      code: json['code'] as String?,
      name: json['name'] as String,
      hours: json['hours'] as int? ?? 60,
      period: json['period'] as int? ?? 1,
      type: json['type'] as String? ?? 'computacao',
      prereqs: (json['prereqs'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      desc: json['desc'] as String? ?? '',
      status: parsedStatus,
      grade: json['grade'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    if (code != null) 'code': code,
    'name': name,
    'hours': hours,
    'period': period,
    'type': type,
    'prereqs': prereqs,
    'desc': desc,
    'status': status.name,
    'grade': grade,
  };
}
```

---

## 3. Implementação do Controlador Central (`ScheduleController`)

Substituindo o antigo hook `useSchedule.ts`:

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/models/discipline_model.dart';

class ScheduleController extends ChangeNotifier {
  String? _selectedCourse;
  ThemeMode _themeMode = ThemeMode.system;
  List<Discipline> _disciplinesList = [];
  List<Discipline> _schedule = [];
  List<String> _completedDisciplines = [];
  int _selectedPeriod = 1;
  String _searchQuery = '';
  String? _conflictMsg;

  String? get selectedCourse => _selectedCourse;
  ThemeMode get themeMode => _themeMode;
  List<Discipline> get disciplinesList => _disciplinesList;
  List<Discipline> get schedule => _schedule;
  List<String> get completedDisciplines => _completedDisciplines;
  int get selectedPeriod => _selectedPeriod;
  String get searchQuery => _searchQuery;
  String? get conflictMsg => _conflictMsg;

  // Inicialização e Carga do SharedPreferences
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _selectedCourse = prefs.getString('selectedCourse');
    
    final themeStr = prefs.getString('themePreference');
    if (themeStr == 'light') _themeMode = ThemeMode.light;
    else if (themeStr == 'dark') _themeMode = ThemeMode.dark;
    else _themeMode = ThemeMode.system;

    final completedStr = prefs.getString('completedDisciplines');
    if (completedStr != null) {
      _completedDisciplines = List<String>.from(jsonDecode(completedStr));
    }

    if (_selectedCourse != null) {
      final scheduleStr = prefs.getString('schedule_${_selectedCourse}');
      if (scheduleStr != null) {
        final List list = jsonDecode(scheduleStr);
        _schedule = list.map((e) => Discipline.fromJson(e)).toList();
      }
    }
    notifyListeners();
  }

  void changeCourse(String? course) async {
    _selectedCourse = course;
    final prefs = await SharedPreferences.getInstance();
    if (course != null) {
      await prefs.setString('selectedCourse', course);
    } else {
      await prefs.remove('selectedCourse');
    }
    _schedule = [];
    notifyListeners();
  }

  void cycleTheme() async {
    if (_themeMode == ThemeMode.system) _themeMode = ThemeMode.light;
    else if (_themeMode == ThemeMode.light) _themeMode = ThemeMode.dark;
    else _themeMode = ThemeMode.system;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('themePreference', _themeMode.name);
    notifyListeners();
  }

  // Algoritmo de Conflito de Horários
  Map<String, dynamic>? checkConflict(Discipline newDisc) {
    for (final session in newDisc.sessions) {
      for (final scheduled in _schedule) {
        if (scheduled.id == newDisc.id) continue;
        for (final schedSession in scheduled.sessions) {
          if (session.day == schedSession.day) {
            final r1 = _parseTimeToMinutes(session.time);
            final r2 = _parseTimeToMinutes(schedSession.time);
            bool overlap = false;
            if (r1 != null && r2 != null) {
              overlap = r1['start']! < r2['end']! && r2['start']! < r1['end']!;
            } else {
              overlap = session.time.trim() == schedSession.time.trim();
            }
            if (overlap) {
              return {'conflict': true, 'withName': scheduled.name};
            }
          }
        }
      }
    }
    return null;
  }

  Map<String, int>? _parseTimeToMinutes(String timeStr) {
    final parts = timeStr.split('-');
    if (parts.length != 2) return null;
    int parseSingle(String s) {
      final t = s.trim().split(':');
      if (t.length != 2) return 0;
      return int.parse(t[0]) * 60 + int.parse(t[1]);
    }
    return {'start': parseSingle(parts[0]), 'end': parseSingle(parts[1])};
  }

  void toggleDiscipline(Discipline disc) async {
    final isScheduled = _schedule.any((d) => d.id == disc.id);
    if (isScheduled) {
      _schedule.removeWhere((d) => d.id == disc.id);
      _conflictMsg = null;
    } else {
      final conflict = checkConflict(disc);
      if (conflict != null) {
        _conflictMsg = 'Conflito: ${disc.name} choca com ${conflict['withName']}.';
        notifyListeners();
        Future.delayed(const Duration(seconds: 4), () {
          _conflictMsg = null;
          notifyListeners();
        });
        return;
      } else {
        _schedule.add(disc);
        _conflictMsg = null;
      }
    }

    if (_selectedCourse != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('schedule_${_selectedCourse}', jsonEncode(_schedule));
    }
    notifyListeners();
  }

  void toggleCompleted(String discId) async {
    if (_completedDisciplines.contains(discId)) {
      _completedDisciplines.remove(discId);
    } else {
      _completedDisciplines.add(discId);
      // Remove da grade atual automaticamente
      _schedule.removeWhere((d) => d.id == discId || d.code == discId);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('completedDisciplines', jsonEncode(_completedDisciplines));
    notifyListeners();
  }
}
```

---

## 4. Renderização das Curvas Bézier no Flutter (`CustomPainter`)

Para desenhar o grafo de dependências da matriz curricular de forma fluida:

```dart
import 'dart:math';
import 'package:flutter/material.dart';

class ConnectorLine {
  final Offset start;
  final Offset end;
  final Color color;

  ConnectorLine({required this.start, required this.end, required this.color});
}

class MatrixGraphPainter extends CustomPainter {
  final List<ConnectorLine> lines;

  MatrixGraphPainter({required this.lines});

  @override
  void paint(Canvas canvas, Size size) {
    for (final line in lines) {
      final paint = Paint()
        ..color = line.color
        ..strokeWidth = 2.5
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      final dx = line.end.dx - line.start.dx;
      final controlOffset = max(30.0, dx.abs() * 0.4);

      final cp1 = Offset(line.start.dx + (dx > 0 ? controlOffset : -controlOffset), line.start.dy);
      final cp2 = Offset(line.end.dx - (dx > 0 ? controlOffset : -controlOffset), line.end.dy);

      final path = Path()
        ..moveTo(line.start.dx, line.start.dy)
        ..cubicTo(cp1.dx, cp1.dy, cp2.dx, cp2.dy, line.end.dx, line.end.dy);

      canvas.drawPath(path, paint);

      // Desenhar ponta de seta no ponto final
      _drawArrowHead(canvas, cp2, line.end, line.color);
    }
  }

  void _drawArrowHead(Canvas canvas, Offset from, Offset to, Color color) {
    final arrowPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final angle = atan2(to.dy - from.dy, to.dx - from.dx);
    const arrowSize = 6.0;

    final path = Path()
      ..moveTo(to.dx, to.dy)
      ..lineTo(to.dx - arrowSize * cos(angle - pi / 6), to.dy - arrowSize * sin(angle - pi / 6))
      ..lineTo(to.dx - arrowSize * cos(angle + pi / 6), to.dy - arrowSize * sin(angle + pi / 6))
      ..close();

    canvas.drawPath(path, arrowPaint);
  }

  @override
  bool shouldRepaint(covariant MatrixGraphPainter oldDelegate) => true;
}
```

---

## 5. Mapeamento de Componentes React $\rightarrow$ Widgets Flutter

| Componente Original (React) | Widget Equivalente (Flutter) | Pacote / Recurso Recomendado |
| :--- | :--- | :--- |
| `App.tsx` (Roteamento simples) | `MaterialApp` com `home: HomeScreen()` | `MaterialApp`, `ThemeData` |
| `HomeView.tsx` | `HomeScreen` | `Scaffold`, `CustomScrollView`, `InkWell` |
| `Navbar.tsx` | `AppBar` ou `SliverAppBar` | Nativo do Flutter |
| `Sidebar.tsx` | `ScheduleSidebarWidget` ou `Drawer` | `ListView.builder`, `TextField` |
| `ScheduleGrid.tsx` | `ScheduleGridWidget` | `SingleChildScrollView(scrollDirection: Axis.horizontal)` + `Table` |
| `MatrizView.tsx` | `CurriculumMatrixScreen` | `InteractiveViewer` + `Row` com colunas de períodos + `CustomPaint` |
| `DisciplineDetailsModal.tsx` | `DisciplineDetailsBottomSheet` | `showModalBottomSheet()` |
| `DisciplinesView.tsx` | `CatalogScreen` | `ListView.builder`, `Card`, `FilterChip` |
| `AdminView.tsx` | `AdminExtractionScreen` | `file_picker`, `google_generative_ai` |
