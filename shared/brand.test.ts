import { afterEach, describe, expect, it } from 'vitest';
import { BRAND, brand } from './brand';
import { setLocale, tr } from './i18n';

describe('brand', () => {
  it('troca a palavra inteira Habblaud pelo nome do fork', () => {
    expect(brand('Habblaud')).toBe(BRAND);
    expect(brand('O Habblaud não respondeu')).toBe(`O ${BRAND} não respondeu`);
    expect(brand('Habblaud: permissões')).toBe(`${BRAND}: permissões`);
    expect(brand("Habblaud's office")).toBe(`${BRAND}'s office`);
  });

  it('preserva Habblaud World, mesmo na frase em que Habblaud aparece sozinho', () => {
    expect(brand('Habblaud World')).toBe('Habblaud World');
    expect(brand('O Habblaud manda ao Habblaud World')).toBe(`O ${BRAND} manda ao Habblaud World`);
  });

  it('não toca identificadores: minúsculas, maiúsculas, domínios e caminhos', () => {
    expect(brand('~/.habblaud/usage')).toBe('~/.habblaud/usage');
    expect(brand('HABBLAUD_BIND=0.0.0.0')).toBe('HABBLAUD_BIND=0.0.0.0');
    expect(brand('privacidade@habblaud.com')).toBe('privacidade@habblaud.com');
    expect(brand('habblaud-data')).toBe('habblaud-data');
  });

  it('texto sem o nome volta igual', () => {
    expect(brand('')).toBe('');
    expect(brand('nada aqui')).toBe('nada aqui');
  });
});

describe('tr() com a marca', () => {
  afterEach(() => setLocale('pt-BR'));

  it('aplica a marca ao texto traduzido, em cada idioma', () => {
    const src = 'O Habblaud não respondeu em {0}';
    setLocale('pt-BR');
    expect(tr(src, ['x'])).toBe(`O ${BRAND} não respondeu em x`);
    for (const l of ['en', 'es', 'fr'] as const) {
      setLocale(l);
      const out = tr(src, ['x']);
      expect(out).toContain(BRAND);
      expect(out).not.toMatch(/\bHabblaud\b(?! World)/);
    }
  });

  it('as lacunas continuam sendo preenchidas depois da marca', () => {
    expect(tr('Nova versão do Habblaud: v{0}', ['2.0'])).toBe(`Nova versão do ${BRAND}: v2.0`);
  });
});
