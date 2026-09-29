import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeView } from '../src/components/HomeView';

test('home admin shortcuts appear locally and stay hidden on the public site', () => {
  const previousWindow = (globalThis as any).window;
  const props = {
    loadPredefinedGrade: () => {},
    setView: () => {},
    themePreference: 'light' as const,
    cycleTheme: () => {},
    darkMode: false,
    selectedCourse: null,
    changeCourse: () => {}
  };
  try {
    (globalThis as any).window = { location: { hostname: 'localhost' } };
    const local = renderToStaticMarkup(React.createElement(HomeView, props));
    assert.match(local, /Gerenciador &amp; Importador IA de Cursos/);

    (globalThis as any).window = { location: { hostname: 'my-ufape.vercel.app' } };
    const publicHome = renderToStaticMarkup(React.createElement(HomeView, props));
    assert.doesNotMatch(publicHome, /Gerenciador &amp; Importador IA de Cursos/);
    assert.doesNotMatch(publicHome, /Painel do Administrador/);
  } finally {
    (globalThis as any).window = previousWindow;
  }
});
