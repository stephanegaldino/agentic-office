# Agentic Office: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o clone do Habblaud 1.0.3 num fork chamado Agentic Office em `github.com/stephanegaldino/agentic-office`, com o commit dos andares portado, e abri-lo pelo Tailscale com login para aprovar permissões do celular.

**Architecture:** O nome visível é trocado por uma camada de marca (`shared/brand.ts`) aplicada na saída do `tr()`, para que dicionários e chaves fiquem iguais aos do original; o que fica fora do `tr()` (HTML, notificação, placa, logotipo, plugins, READMEs) é editado à mão. O acesso remoto usa o recurso nativo da 1.0.x (`npm run remote:setup`, porta com login e HTTPS) publicado no tailnet por `tailscale serve`. Identificadores técnicos (`HABBLAUD_*`, `~/.habblaud`, ids de plugin, nomes do Docker) não mudam.

**Tech Stack:** Node 22.12+, TypeScript, Vite, Vitest, Docker Compose, Python 3 + Pillow (placa em pixel art), Claude Code plugins (`claude plugin validate/test`), Tailscale, gh CLI.

**Spec:** `docs/superpowers/specs/2026-10-22-agentic-office-rebrand-design.md`

## Global Constraints

- Base de código: branch `agentic-office`, criado de `origin/main` (1.0.3, commit `faa1a01`). Pasta: `/Users/stephanegaldino/habblaud`.
- Versão continua `1.0.3`; nada de bump.
- Não mudam: `"name": "habblaud"` do `package.json`, variáveis `HABBLAUD_*`, `~/.habblaud`, volume `habblaud-data`, ids e pastas dos plugins (`habblaud`, `habblaud-permissoes`, `habblaud-mensagens`), container/imagem `habblaud`, rotas HTTP, classes CSS, nomes de arquivo e de identificadores no código, o nome "Habblaud World" e `server.habblaud.com`.
- Todo texto visível continua em português dentro de `tr('…')`; os dicionários `shared/locales/{en,es,fr}.ts` **não** são editados neste plano. `npm run i18n:check` precisa continuar passando.
- Comando do Claude Code: `/habblaud` vira `/office`.
- Nunca tocar `shared/world/` nem `server/world/` (regra do `CLAUDE.md`: dados verdadeiros para o Habblaud World).
- Commits em português, mensagem curta no imperativo, terminados com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Ações externas já aprovadas no spec: criar o fork no GitHub e dar push. O login no Tailscale é do usuário.
- Antes de cada commit: `npm run typecheck && npm test` verdes (a partir da Tarefa 3; a Tarefa 2 inclui a suíte toda).

## Review Focus

1. Texto traduzido com "Habblaud" no meio de uma frase em inglês/espanhol/francês (ex.: `en.ts` "Habblaud's office") precisa sair como "Agentic Office's office"; teste na Tarefa 3 cobre o `tr()` nos quatro idiomas.
2. "Habblaud World" dentro de uma frase que também cita "Habblaud" sozinho (ex.: "O Habblaud manda ao Habblaud World") precisa trocar só a primeira ocorrência; teste na Tarefa 3.
3. Caminhos e variáveis citados em textos (`~/.habblaud/usage`, `HABBLAUD_BIND=0.0.0.0`, `habblaud.com`, `npm run docker:up na pasta do Habblaud`) não podem ser quebrados pela substituição; teste na Tarefa 3 cobre os três primeiros.
4. Placa da recepção mais larga que o espaço do renderer (`maxW = 5 * TILE = 80 px`): se o PNG passar de 80 px de largura o desenho fica borrado; a Tarefa 5 fixa a largura em 80 e confere o manifesto.
5. `/office` registrado mas `/habblaud` ainda citado em textos de ajuda (`mod/README.md`, descrição do plugin): a Tarefa 6 faz `grep -rn "/habblaud"` no final e exige zero ocorrências fora do `CHANGELOG.md`.

---

### Tarefa 1: Fork no GitHub e remotes

**Files:**
- Modify: `.git/config` (via `git remote`)

**Interfaces:**
- Produces: remote `origin` = `https://github.com/stephanegaldino/agentic-office.git`; remote `upstream` = `https://github.com/marmottajr/habblaud.git`.

- [ ] **Step 1: Criar o fork (ação externa aprovada)**

```bash
cd /Users/stephanegaldino/habblaud
gh repo fork marmottajr/habblaud --fork-name agentic-office --remote=false --clone=false
gh repo view stephanegaldino/agentic-office --json name,isFork,parent --jq '{name,isFork,parent:.parent.nameWithOwner}'
```

Esperado: `{"name":"agentic-office","isFork":true,"parent":"marmottajr/habblaud"}`.

- [ ] **Step 2: Reapontar os remotes**

```bash
git remote rename origin upstream
git remote add origin https://github.com/stephanegaldino/agentic-office.git
git fetch origin
git remote -v
```

Esperado: `origin` → `stephanegaldino/agentic-office`, `upstream` → `marmottajr/habblaud`. O branch `agentic-office` continua rastreando `upstream/main` por enquanto (o push final, na Tarefa 10, troca para `origin`).

- [ ] **Step 3: Conferir que o branch de trabalho é o certo**

```bash
git branch --show-current   # agentic-office
git log --oneline -2        # 7297caa Spec…, faa1a01 Versão 1.0.3…
```

---

### Tarefa 2: Portar "Prédio de vários andares" para a 1.0.3

**Files:**
- Modify (via cherry-pick de `df47380`): 21 arquivos em `client/src/world/**`
- Conflitos esperados: `client/src/world/index.ts`, `client/src/world/render/overlay.ts`, `client/src/world/render/renderer.ts`, `client/src/world/social/social.ts`
- Test: `client/src/world/layout/layout.test.ts`, `client/src/world/sim/sim.test.ts`, `client/src/world/sim/sim-pure.test.ts`

**Interfaces:**
- Consumes: o commit `df47380` do branch local `andares`.
- Produces: o escritório local com andares empilhados (recepção no térreo, lobbies "Nº andar"), sem alterar nada do Habblaud World (`client/src/world/city/**`, `client/src/world/visit/**`, `shared/world/**`).

- [ ] **Step 1: Ver o que o commit faz, antes de aplicar**

```bash
git show --stat df47380
git show df47380 -- client/src/world/render/overlay.ts | head -80
```

- [ ] **Step 2: Cherry-pick**

```bash
git cherry-pick df47380
```

Esperado: para com `CONFLICT (content)` nos 4 arquivos listados. `git status` mostra os 17 restantes já aplicados.

- [ ] **Step 3: Resolver cada conflito**

Regra: dentro dos marcadores `<<<<<<< HEAD` … `=======` … `>>>>>>> df47380`, o lado `HEAD` é a 1.0.3 (cidade, visita, social leve, `vis.id === 'core:recepcao'`); o lado `df47380` é o layout de andares (`vis.layout.kind`, `floor`, elevadores). Manter os dois quando são trechos independentes; quando é a mesma linha, a forma da 1.0.3 vale para o que cita cidade/visita e a dos andares vale para layout do prédio. Exemplo concreto em `overlay.ts` (placa da recepção): a 1.0.3 tem

```ts
const text = room ? room.info.name : vis.id === 'core:recepcao' ? 'Habblaud' : null;
```

e o commit dos andares tem

```ts
const text = room
  ? room.info.name
  : vis.layout.kind === 'reception'
    ? 'Habblaud'
    : vis.layout.kind === 'lobby'
      ? `${vis.layout.floor + 1}º andar`
      : null;
```

Resultado: a versão dos andares (ela cobre o caso da recepção e acrescenta os lobbies). Para cada arquivo:

```bash
grep -n "<<<<<<<\|>>>>>>>" client/src/world/index.ts client/src/world/render/overlay.ts client/src/world/render/renderer.ts client/src/world/social/social.ts
```

Editar até o grep devolver nada; depois `git add` dos quatro.

- [ ] **Step 4: Typecheck e testes**

```bash
npm install
npm run typecheck
npm test
```

Esperado: 0 erros de tipo; suíte verde, incluindo `layout.test.ts`, `sim.test.ts`, `sim-pure.test.ts`. Se um teste da cidade (`client/src/world/city/**`, `visit/**`) falhar, a resolução do conflito pegou o lado errado: voltar ao Step 3 nesse arquivo.

- [ ] **Step 5: Conferir que o World não foi tocado**

```bash
git diff --cached --stat -- shared/world server/world
```

Esperado: vazio.

- [ ] **Step 6: Concluir o cherry-pick**

```bash
git -c core.editor=true cherry-pick --continue
git log -1 --stat | head -30
```

- [ ] **Step 7: Olhar no navegador**

```bash
npm run demo
```

Abrir `http://localhost:4747`: o prédio cresce em andares (não para o lado), a recepção fica no térreo com a placa, cada andar de cima tem lobby "2º andar", "3º andar"… Parar com Ctrl+C.

---

### Tarefa 3: Camada de marca em `shared/brand.ts` e integração no `tr()`

**Files:**
- Create: `shared/brand.ts`
- Create: `shared/brand.test.ts`
- Modify: `shared/i18n.ts` (função `tr`, linhas ~105-110)
- Modify: `shared/i18n.test.ts` (um caso novo)

**Interfaces:**
- Produces: `export const BRAND = 'Agentic Office'`; `export function brand(text: string): string`. Tarefas 4, 6 e 7 importam `BRAND` de `shared/brand` (no cliente: `import { BRAND } from '../../shared/brand'` a partir de `client/src/ui/*`; no servidor: `from '../../shared/brand'` a partir de `server/http/*`).

- [ ] **Step 1: Escrever o teste que falha**

`shared/brand.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run shared/brand.test.ts
```

Esperado: FAIL, `Cannot find module './brand'`.

- [ ] **Step 3: Implementar**

`shared/brand.ts`:

```ts
// Nome do fork. O código, os dicionários e as chaves do tr() continuam dizendo "Habblaud" (igual ao projeto
// original, para o merge com ele não brigar); o nome visível é trocado aqui, na saída do tr() e nos poucos
// textos que ficam fora dele (HTML, notificação, placa, logotipo, plugins).
export const BRAND = 'Agentic Office';

/** Palavra inteira "Habblaud" (H maiúsculo), exceto quando é o "Habblaud World" (o serviço online do autor original). */
const NAME = /\bHabblaud\b(?! World\b)/g;

/** Troca o nome do produto num texto já traduzido. Identificadores (habblaud, HABBLAUD_, habblaud.com) não casam. */
export function brand(text: string): string {
  return text.replace(NAME, BRAND);
}
```

Em `shared/i18n.ts`, importar e aplicar no `tr()`:

```ts
import { brand } from './brand';
import { DICTIONARIES } from './locales/all';
```

```ts
export function tr(src: string, args?: readonly unknown[]): string {
  const dict = DICTS[current];
  const s = brand((dict && dict[src]) || src);
  if (!args || args.length === 0) return s;
  return s.replace(/\{(\d+)\}/g, (m, i: string) => (Number(i) < args.length ? String(args[Number(i)]) : m));
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run shared/brand.test.ts shared/i18n.test.ts
```

Esperado: PASS nos dois arquivos. Se um caso antigo de `i18n.test.ts` comparar uma tradução que contém "Habblaud" com o dicionário cru, ajustar esse caso para passar o esperado por `brand()`.

- [ ] **Step 5: Suíte inteira, tipos e i18n**

```bash
npm run typecheck && npm test && npm run i18n:check
```

Esperado: tudo verde; o `i18n:check` sem textos novos (nenhum `tr()` foi alterado). Testes que comparam a saída do `tr()` com strings fixas contendo "Habblaud" (procurar com `git grep -n "Habblaud" -- '*.test.ts'`) passam a esperar "Agentic Office": corrigir apenas os que falharem, mantendo a chave em PT no `tr()`.

- [ ] **Step 6: Commit**

```bash
git add shared/brand.ts shared/brand.test.ts shared/i18n.ts shared/i18n.test.ts
git add -u
git commit -m "Marca: Agentic Office na saída do tr(), mantendo os dicionários do original

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 4: Textos fora do `tr()` no cliente e no servidor

**Files:**
- Modify: `client/index.html:9-22`
- Modify: `client/src/ui/notify.ts:10`
- Modify: `client/src/ui/widgets.ts:136`
- Modify: `client/src/ui/version.ts:159`
- Modify: `client/src/world/render/overlay.ts` (placa da recepção, linha que vem da Tarefa 2)
- Modify: `client/src/ui/icons.ts:332-348` (logotipo em pixels)
- Modify: `client/src/ui/styles.css:657-662` e `:3319-3322`
- Modify: `server/http/remote.ts:319` e `:343`
- Modify: `server/remote/tls.ts:213-214` e `:260`

**Interfaces:**
- Consumes: `BRAND` de `shared/brand`.

- [ ] **Step 1: Página (`client/index.html`)**

Trocar, nas linhas 9 a 22, cada `Habblaud` por `Agentic Office`:

```html
<title>Agentic Office</title>
…
<meta property="og:site_name" content="Agentic Office" />
<meta property="og:title" content="Agentic Office" />
…
<meta property="og:image:alt" content="O escritório do Agentic Office em pixel art, com salas de projeto e agentes trabalhando." />
…
<meta name="twitter:title" content="Agentic Office" />
```

Conferir: `grep -n Habblaud client/index.html` devolve vazio.

- [ ] **Step 2: Notificação e título da aba (`notify.ts`)**

```ts
import { BRAND } from '../../../shared/brand';
…
const BASE_TITLE = BRAND;
```

(a linha 57, `tr('Habblaud — precisa de você')`, fica: o `tr()` já aplica a marca.)

- [ ] **Step 3: Texto do leitor de tela do logotipo (`widgets.ts:136`) e "Sobre" (`version.ts:159`)**

```ts
// widgets.ts
import { BRAND } from '../../../shared/brand';
…
el.append(h('span', { class: 'ui-sr', text: BRAND }));
```

```ts
// version.ts
import { BRAND } from '../../../shared/brand';
…
h('div', { class: 'ui-about__head' }, h('span', { class: 'ui-about__name' }, `${BRAND} `, this.name), this.checkBtn),
```

- [ ] **Step 4: Placa da recepção (`overlay.ts`)**

Na linha da placa (resultado da Tarefa 2), `'Habblaud'` vira `BRAND`:

```ts
import { BRAND } from '../../../../shared/brand';
…
: vis.layout.kind === 'reception'
  ? BRAND
```

(ajustar o número de `../` ao caminho real: `client/src/world/render/` está a 4 níveis de `shared/`.)

- [ ] **Step 5: Logotipo em pixels (`icons.ts`)**

Substituir o bloco `WORDMARK_ROWS` (comentário incluído) por:

```ts
/**
 * Logotipo "Agentic Office" em pixels, com a mesma fonte bitmap da placa da marca (assets/brand/signage.png, gerada
 * por scripts/assets/pixelart.py). c = "Agentic" (creme), t = "Office" (âmbar), s = sombra de 1 px. 71x10.
 */
export const WORDMARK_ROWS = [
  '.ccc.....................c....c..........ttt....tt...tt..t.............',
  'c.ssc....................cs....s........t.sst..t.ss.t.ss..s............',
  'cs..cs.cccc..ccc..cccc..ccc..cc...ccc...ts..ts.ts...ts..tt...ttt..ttt..',
  'cccccsc.sscsc.ssc.csssc..css..cs.c.sss..ts..tsttt..ttt...ts.t.ssst.sst.',
  'cssscscs..cscccccscs..cs.cs...cs.cs.....ts..ts.tss..tss..ts.ts...ttttts',
  'cs..cscs..cscssssscs..cs.cs...cs.cs.....ts..ts.ts...ts...ts.ts...tsssss',
  'cs..cs.ccccs.ccc..cs..cs..cc.ccc..ccc....ttt.s.ts...ts..ttt..ttt..ttt..',
  '.s...s..sscs..sss..s...s...ss.sss..sss....sss...s....s...sss..sss..sss.',
  '.......ccc.s...........................................................',
  '........sss............................................................',
] as const;
```

A linha `export const WORDMARK = pixelIcon(WORDMARK_ROWS, …)` fica igual. O SVG passa de 45x8 para 71x10; o CSS fixa o tamanho na tela, então ajustar a proporção (7.1:1):

```css
.ui-wordmark {
  display: block;
  width: 170px;
  height: 24px;
  image-rendering: pixelated;
}
```

```css
.ui-splash__name .ui-wordmark {
  width: 284px;
  height: 40px;
}
```

- [ ] **Step 6: Página de login do celular e certificado (`server/http/remote.ts`, `server/remote/tls.ts`)**

`remote.ts`: importar `BRAND` (`import { BRAND } from '../../shared/brand';`) e trocar as duas linhas cruas:

```html
<meta name="apple-mobile-web-app-title" content="${BRAND}">
…
<h1>${BRAND}</h1>
```

(`tr('Habblaud · entrar')` no `<title>` fica: o `tr()` aplica a marca.)

`tls.ts`: o nome da CA aparece no celular ao instalar o certificado. Trocar:

```ts
`CN = ${BRAND} local CA (${label.replace(/[^A-Za-z0-9 .-]/g, '')})`,
`O = ${BRAND}`,
…
'-subj', `/CN=${cn}/O=${BRAND}`
```

com `import { BRAND } from '../../shared/brand';`. Isso só vale para CAs criadas daqui em diante (a Tarefa 9 cria a primeira).

- [ ] **Step 7: Varredura final de textos crus**

```bash
git grep -n "Habblaud" -- client/src server ':!*.test.ts' ':!*.md' | grep -v "tr(" | grep -v "Habblaud World" | grep -v ":\s*//" | grep -v ":\s*/\?\*" | grep -v "winkill.ts"
```

Esperado: nenhuma linha de texto visível (sobram só comentários e o `HabblaudConsole` do PowerShell, que é identificador).

- [ ] **Step 8: Typecheck, testes, olhar**

```bash
npm run typecheck && npm test
npm run demo
```

No navegador: aba "Agentic Office", logotipo na barra do topo com "Agentic Office" nítido, "Configurações › Sobre" dizendo "Agentic Office 1.0.3", placa da recepção com o nome (ainda a imagem antiga, até a Tarefa 5). Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add client/index.html client/src/ui/notify.ts client/src/ui/widgets.ts client/src/ui/version.ts client/src/world/render/overlay.ts client/src/ui/icons.ts client/src/ui/styles.css server/http/remote.ts server/remote/tls.ts
git commit -m "Marca: Agentic Office na página, no logotipo, na placa e no login do celular

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 5: Placa física da recepção (`signage.png`)

**Files:**
- Modify: `scripts/assets/pixelart.py:261-289` (`signage()`)
- Regenerate: `client/public/assets/brand/signage.png`, `client/public/assets/brand/signage@4x.png`
- Modify: `client/public/assets/manifest.json` (`brand.signage`, `brand.signageLarge`)
- Test: `scripts/assets/test_pixelops.py` (continua passando) + checagem de largura abaixo

**Interfaces:**
- Consumes: `art.signage()`, `pixelops.upscale(img, 4)`, `text_width`, `draw_text` (já existem).
- Produces: PNG 80x16 que o renderer desenha em escala inteira (`maxW = 5 * TILE = 80`).

- [ ] **Step 1: Teste de largura (falha antes)**

Acrescentar ao fim de `scripts/assets/test_pixelops.py`:

```python
class SignageTest(unittest.TestCase):
    def test_signage_cabe_na_placa_do_renderer(self):
        import pixelart as art
        img = art.signage()
        self.assertEqual((img.width, img.height), (80, 16))
        # o texto inteiro cabe entre os parafusos
        self.assertLessEqual(art.text_width("Agentic Office") + 2 * 4, img.width)
```

(se o arquivo não importa `pixelart` no topo, o `import` local acima basta.)

```bash
python3 -E scripts/assets/test_pixelops.py
```

Esperado: FAIL em `test_signage_cabe_na_placa_do_renderer` (`(64, 16) != (80, 16)`).

- [ ] **Step 2: Reescrever `signage()`**

```python
def signage() -> Image.Image:
    """Placa da recepção, 80x16: chapa azul-marinho com bisel, parafusos e "Agentic Office"."""
    w, h = 80, 16
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    outline, top, face, bottom = hex_rgba("#1c2541"), hex_rgba("#3a4a70"), hex_rgba("#2a3656"), hex_rgba("#222b47")
    for y in range(h):
        for x in range(w):
            if x in (0, w - 1) and y in (0, h - 1):
                continue  # cantos arredondados
            if x in (0, w - 1) or y in (0, h - 1):
                px[x, y] = outline
            elif y == 1:
                px[x, y] = top
            elif y == h - 2:
                px[x, y] = bottom
            else:
                px[x, y] = face
    for sx in (2, w - 3):  # parafusos, fora da faixa do texto (x 4..75)
        px[sx, 7] = hex_rgba("#c9d3e3")
        px[sx, 8] = hex_rgba("#7d8aa3")
    # texto centralizado com sombra de 1px; "Agentic" claro e "Office" na cor das janelas acesas
    tx, ty = (w - text_width("Agentic Office")) // 2, 4
    office_x = tx + text_width("Agentic ") + 1
    draw_text(img, tx, ty + 1, "Agentic", "#151c33")
    draw_text(img, office_x, ty + 1, "Office", "#151c33")
    draw_text(img, tx, ty, "Agentic", "#f4f1ea")
    draw_text(img, office_x, ty, "Office", "#fac665")
    return img
```

Também trocar `"Habblaud"` por `"Agentic Office"` na docstring da linha 3 do arquivo (`a placa "Habblaud"`).

- [ ] **Step 3: Rodar o teste**

```bash
python3 -E scripts/assets/test_pixelops.py
```

Esperado: OK (todos os testes).

- [ ] **Step 4: Gerar só a placa e atualizar o manifesto**

O `postprocess.py` inteiro precisa do cache de imagens brutas (não está no repositório). Gerar só a placa:

```bash
cd /Users/stephanegaldino/habblaud
python3 -E - <<'EOF'
import json, sys
from pathlib import Path
sys.path.insert(0, "scripts/assets")
import pixelart as art, pixelops as px
brand = Path("client/public/assets/brand")
sign = art.signage()
sign.save(brand / "signage.png")
px.upscale(sign, 4).save(brand / "signage@4x.png")
mpath = Path("client/public/assets/manifest.json")
m = json.loads(mpath.read_text())
m["brand"]["signage"] = {"file": "brand/signage.png", "w": sign.width, "h": sign.height}
m["brand"]["signageLarge"] = {"file": "brand/signage@4x.png", "w": sign.width * 4, "h": sign.height * 4}
mpath.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n")
print("ok", sign.size)
EOF
git diff --stat client/public/assets/manifest.json
```

Esperado: `ok (80, 16)`; o diff do manifesto muda só `w`/`h` da placa. Se o `json.dumps` reformatar o arquivo inteiro (diff grande), refazer com o mesmo `indent` que o arquivo usa (`head -5 client/public/assets/manifest.json` mostra) e `ensure_ascii=False`.

- [ ] **Step 5: Olhar**

```bash
npm run demo
```

Placa da recepção: "Agentic Office" nítido, chapa azul, parafusos nas pontas, sem borrão. Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add scripts/assets/pixelart.py scripts/assets/test_pixelops.py client/public/assets/brand/signage.png client/public/assets/brand/signage@4x.png client/public/assets/manifest.json
git commit -m "Marca: placa da recepção com Agentic Office (80x16)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 6: Plugins e o comando `/office`

**Files:**
- Modify: `mod/habblaud/hooks/register.ts:228-244`, `:361-376`, `:403`
- Modify: `mod/habblaud/hooks/hooks.json`
- Modify: `mod/habblaud/tests/habblaud.test.ts:79-80`, `:90`, `:149`, `:219-252`
- Modify: `mod/habblaud/.claude-plugin/plugin.json`, `mod/habblaud-permissoes/.claude-plugin/plugin.json`, `mod/habblaud-mensagens/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `mod/README.md:31`, `:130`

**Interfaces:**
- Produces: comando `office` registrado em `session.start`; `summaryText` devolve `Agentic Office <versão> em <url>` na primeira linha. O plugin **não** importa `shared/brand` (ele roda dentro do Claude Code, sem o build do projeto): o nome fica literal.

- [ ] **Step 1: Atualizar os testes primeiro (`habblaud.test.ts`)**

Linha 79-80:

```ts
/** /office digitado no terminal (o kit pede a origem e onde a resposta aparece). */
const RUN: CommandRunInput = { command: 'office', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }
```

Linhas 90 e 149: `expect(w.commands).toEqual(['office'])`.

Bloco `describe('/habblaud', …)` (linha 219) vira `describe('/office', …)` com os textos esperados:

```ts
'Agentic Office 0.3.0 em http://localhost:4850',
…
expect(out.text).toBe('Agentic Office 0.3.0 em http://localhost:4850\n1 agente · 0 trabalhando · ninguém precisa de você')
…
expect(out.text).toBe('O Agentic Office não respondeu em http://localhost:4850. Para subir: npm run docker:up na pasta do Agentic Office.')
…
test('Agentic Office de antes do mod (404 "rota desconhecida"): pede para atualizar', async ($, on) => {
  …
  expect(out.text).toMatch(/^O Agentic Office em http:\/\/localhost:4747 está numa versão sem a rota do mod/)
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd mod/habblaud && claude plugin test; cd ../..
```

Esperado: falhas em `/office` (comando desconhecido) e nos textos.

- [ ] **Step 3: Implementar em `register.ts`**

Linhas 228-244:

```ts
/** A resposta do /office com o Agentic Office no ar. */
export function summaryText(s: Summary, url: string): string {
  const agents = s.agents === 1 ? '1 agente' : `${s.agents} agentes`
  const waiting = s.waiting.length === 0 ? 'ninguém precisa de você' : s.waiting.length === 1 ? '1 precisa de você' : `${s.waiting.length} precisam de você`
  const lines = [`Agentic Office ${s.version} em ${url}`, `${agents} · ${s.working} trabalhando · ${waiting}`]
  for (const w of s.waiting) lines.push(`✋ ${w.name} (${w.room}): ${w.waitingFor}${w.answerable ? ' · dá para responder pelo escritório' : ''}`)
  return lines.join('\n')
}

export function offlineText(url: string): string {
  return `O Agentic Office não respondeu em ${url}. Para subir: npm run docker:up na pasta do Agentic Office.`
}

export function outdatedText(url: string): string {
  return `O Agentic Office em ${url} está numa versão sem a rota do mod. Para atualizar: git pull e npm run docker:up na pasta do Agentic Office.`
}
```

Linha 374:

```ts
await $.command.register({ name: 'office', description: 'Resumo do Agentic Office: quantos agentes, quem trabalha e quem precisa de você' })
```

Linha 403:

```ts
on('command.run', { command: 'office' }, async ($) => {
```

Comentários das linhas 15, 228 e 361 que dizem `/habblaud` passam a dizer `/office`.

`hooks.json`:

```json
{
  "description": "Módulo de hooks do mod do Agentic Office (uso do plano, aviso embaixo do prompt e /office)",
  "modules": ["./register.ts"]
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd mod/habblaud && claude plugin test; cd ../..
```

Esperado: todos verdes.

- [ ] **Step 5: Manifestos**

`mod/habblaud/.claude-plugin/plugin.json`:

```json
{
  "name": "habblaud",
  "displayName": "Agentic Office",
  "version": "1.0.3",
  "description": "Liga a sessão ao Agentic Office: grava o uso do plano (5h e semanal) para o escritório, avisa embaixo do prompt quando outra sessão precisa de você e adiciona o comando /office.",
  "author": { "name": "Stephane Galdino", "url": "https://github.com/stephanegaldino" },
  "homepage": "https://github.com/stephanegaldino/agentic-office#readme",
  "repository": "https://github.com/stephanegaldino/agentic-office",
  "license": "MIT",
  "keywords": ["habblaud", "agentic-office", "escritorio", "uso", "rate-limits", "status"]
}
```

`mod/habblaud-permissoes/.claude-plugin/plugin.json`: `displayName` → `"Agentic Office: permissões pelo escritório"`, `description` com `pelo Agentic Office`, mesmos `author`, `homepage`, `repository`; `keywords` ganham `"agentic-office"`.

`mod/habblaud-mensagens/.claude-plugin/plugin.json`: `displayName` → `"Agentic Office: mensagens pelo escritório"`, `description` com `no Agentic Office`, mesmos `author`, `homepage`, `repository`; `keywords` ganham `"agentic-office"`.

`.claude-plugin/marketplace.json`:

```json
{
  "name": "habblaud",
  "owner": { "name": "Stephane Galdino", "url": "https://github.com/stephanegaldino" },
  "description": "Plugins do Agentic Office (fork do Habblaud, de Márcio Junior), o escritório virtual em pixel art das suas sessões do Claude Code.",
  "version": "1.0.3",
  "plugins": [
    {
      "name": "habblaud",
      "source": "./mod/habblaud",
      "description": "Mod do Agentic Office: uso do plano (5h e semanal) para o escritório, aviso embaixo do prompt quando outra sessão precisa de você e o comando /office.",
      "category": "productivity"
    },
    {
      "name": "habblaud-permissoes",
      "source": "./mod/habblaud-permissoes",
      "description": "Aprovar ou recusar pelo Agentic Office os pedidos de permissão do Claude Code e responder as perguntas do agente (hook PermissionRequest).",
      "category": "productivity"
    },
    {
      "name": "habblaud-mensagens",
      "source": "./mod/habblaud-mensagens",
      "description": "Mandar mensagens pelo Agentic Office: o que você digita no escritório entra na sessão como se você tivesse digitado no terminal.",
      "category": "productivity"
    }
  ]
}
```

- [ ] **Step 6: `mod/README.md`**

Linha 31: `- **`/office`:** resumo do escritório inteiro…`. Linha 130: `claude -p "/office" --plugin-dir mod/habblaud`. Demais menções a "Habblaud" em prosa desse arquivo viram "Agentic Office" (caminhos `mod/habblaud*` ficam).

- [ ] **Step 7: Validar e varrer**

```bash
claude plugin validate --strict mod/habblaud
claude plugin validate --strict mod/habblaud-permissoes
claude plugin validate --strict mod/habblaud-mensagens
claude plugin validate --strict .
grep -rn "/habblaud" --exclude-dir=node_modules --exclude-dir=.git --exclude=CHANGELOG.md . | grep -v "mod/habblaud" | grep -v "\.habblaud/"
```

Esperado: quatro `✔ Validation passed`; o grep devolve vazio (sobram só caminhos `mod/habblaud…` e `~/.habblaud/…`, filtrados).

- [ ] **Step 8: Commit**

```bash
git add mod .claude-plugin
git commit -m "Plugins: Agentic Office nos manifestos e /office no lugar de /habblaud

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 7: `package.json`, READMEs, licença e CHANGELOG

**Files:**
- Modify: `package.json:5-11`
- Modify: `README.md`, `README.pt-BR.md`, `README.es.md`, `README.fr.md` (cabeçalho, crédito, 5 URLs cada)
- Modify: `LICENSE`
- Modify: `CHANGELOG.md` (seção "Não lançado")

- [ ] **Step 1: `package.json`**

```json
"description": "Agentic Office: escritório virtual animado (fork do Habblaud) que mostra, em tempo real, o que seus agentes do Claude Code estão fazendo.",
"repository": {
  "type": "git",
  "url": "git+https://github.com/stephanegaldino/agentic-office.git"
},
"homepage": "https://github.com/stephanegaldino/agentic-office#readme",
```

`"name": "habblaud"` e `"version": "1.0.3"` ficam.

- [ ] **Step 2: Conferir que o verificador de versão lê o fork**

```bash
npx tsx -e "import { readFileSync } from 'node:fs'; import { parseGithubRepo } from './server/updates/checker'; console.log(parseGithubRepo(JSON.parse(readFileSync('package.json', 'utf8')).repository))"
```

Esperado: `stephanegaldino/agentic-office`. (Os testes em `server/updates/checker.test.ts` e `client/src/ui/version.test.ts` usam `marmottajr/habblaud` como dado de exemplo do parser; não mudam.)

- [ ] **Step 3: READMEs**

Em cada um dos quatro arquivos, no cabeçalho:

- `alt` da imagem: `Agentic Office logo: a small pixel-art building` (EN) / `Logo do Agentic Office: …` (PT) / `Logo de Agentic Office: …` (ES) / `Logo de Agentic Office : …` (FR).
- `<h1 align="center">Agentic Office</h1>`.
- Logo depois do parágrafo com os links dos idiomas, um parágrafo de crédito:

EN (`README.md`):

```html
<p align="center"><i>Agentic Office is a fork of <a href="https://github.com/marmottajr/habblaud">Habblaud</a>, by Márcio Junior (MIT). The name is different; the office, the plugins and the Habblaud World are his work.</i></p>
```

PT (`README.pt-BR.md`):

```html
<p align="center"><i>O Agentic Office é um fork do <a href="https://github.com/marmottajr/habblaud">Habblaud</a>, de Márcio Junior (MIT). O nome é outro; o escritório, os plugins e o Habblaud World são obra dele.</i></p>
```

ES e FR: a mesma frase traduzida (`El Agentic Office es un fork de …, de Márcio Junior (MIT). El nombre es otro; la oficina, los plugins y el Habblaud World son obra suya.` / `Agentic Office est un fork de …, de Márcio Junior (MIT). Le nom change ; le bureau, les plugins et le Habblaud World sont son œuvre.`).

- As 5 URLs `github.com/marmottajr/habblaud` de cada README (clone, releases, issues…) viram `github.com/stephanegaldino/agentic-office`, **exceto** a do parágrafo de crédito e qualquer uma que aponte para o Habblaud World ou para `docs/world/`. O `git clone` passa a ser:

```bash
git clone https://github.com/stephanegaldino/agentic-office.git habblaud
```

(com o nome da pasta `habblaud` no fim, porque o marketplace e o `findRoot` esperam a pasta local atual.)

- No corpo, "Habblaud" em prosa vira "Agentic Office" só nos títulos de primeiro nível e na primeira frase de cada seção "Como é"/"How it looks"; o resto do texto pode continuar dizendo Habblaud, com o crédito explicando. (Trocar tudo seria conflito garantido no próximo merge.)

```bash
grep -c "marmottajr" README.md README.pt-BR.md README.es.md README.fr.md
```

Esperado: `1` em cada (só o crédito).

- [ ] **Step 4: `LICENSE`**

Abaixo de `Copyright (c) 2026 Márcio Junior`, acrescentar:

```
Copyright (c) 2026 Stephane Galdino (Agentic Office: nome, placa, logotipo e integrações do fork)
```

O resto do texto MIT fica intacto.

- [ ] **Step 5: `CHANGELOG.md`, seção "Não lançado"**

```markdown
## [Não lançado]

### Agentic Office (fork)

- **Nome:** o escritório passa a se chamar Agentic Office (fork do Habblaud 1.0.3, de Márcio Junior). A troca é só no que
  aparece: título, logotipo, placa da recepção, notificações, plugins e READMEs. Variáveis `HABBLAUD_*`, `~/.habblaud`,
  ids dos plugins e nomes do Docker continuam os mesmos; o Habblaud World mantém o nome.
- **Comando:** `/habblaud` vira `/office`.
- **Andares:** o prédio cresce em andares (recepção no térreo, lobbies "Nº andar") em vez de crescer para o lado.
```

- [ ] **Step 6: Testes e commit**

```bash
npm run typecheck && npm test
git add package.json README.md README.pt-BR.md README.es.md README.fr.md LICENSE CHANGELOG.md
git commit -m "Docs: Agentic Office nos READMEs, package.json, licença e changelog

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 8: Subir a nova versão no Mac e nos plugins

**Files:**
- Nenhum no repositório. Toca: container `habblaud`, plugins em `~/.claude/plugins/cache/habblaud/*`.

- [ ] **Step 1: Build**

```bash
npm run build
ls dist/client/index.html dist/server/index.js
grep -o "<title>[^<]*" dist/client/index.html
```

Esperado: `<title>Agentic Office`.

- [ ] **Step 2: Docker**

```bash
npm run docker:up
docker ps --format '{{.Names}} {{.Ports}}' | grep habblaud
curl -s http://127.0.0.1:4747/api/health | head -c 300
```

Esperado: o container `habblaud` publicando `127.0.0.1:4747->4747/tcp`; `/api/health` com `"version":"1.0.3"`. O `docker:up` também diz se atualizou o mod nas contas.

- [ ] **Step 3: Plugins**

```bash
npm run mod:install
cat ~/.claude/plugins/cache/habblaud/habblaud/1.0.3/.claude-plugin/plugin.json | grep displayName
```

Esperado: `"displayName": "Agentic Office"`. Numa sessão aberta do Claude Code, o usuário roda `/reload-plugins`; numa sessão nova, `/office` responde:

```
Agentic Office 1.0.3 em http://localhost:4747
N agentes · N trabalhando · …
```

e `/habblaud` não existe mais.

- [ ] **Step 4: Olhar no navegador**

Abrir `http://localhost:4747`: aba, logotipo, placa e "Sobre" com Agentic Office; o prédio com andares; "Habblaud World" ainda com esse nome no botão da cidade.

---

### Tarefa 9: Acesso remoto com login + Tailscale Serve

**Files:**
- Create: `.env` (gerado por `remote:setup`; fora do git) com as linhas abaixo
- Toca: `~/.habblaud/remote-tls/`, LaunchAgent do mDNS, configuração do Tailscale Serve

**Interfaces:**
- Consumes: `npm run remote:setup` (grava `HABBLAUD_REMOTE_*` no `.env`, porta 443 se livre, senão 4748), `docker-compose.override.yml` gerado pelo `docker:up` com a porta remota publicada em `0.0.0.0`.

- [ ] **Step 1: Setup (interativo: usuário, senha, nome)**

```bash
npm run remote:setup
```

Responder: usuário à escolha; senha de 12+ caracteres; nome do endereço `office` (vira `office.local`); endereço próprio: Enter (pula). Anotar a porta que o setup imprime (`porta 443` ou `porta 4748`).

- [ ] **Step 2: `.env`: o que o celular pode fazer e o nome do Tailscale**

Descobrir o nome da máquina no tailnet (precisa do Tailscale logado; se `Tailscale is stopped.`, o usuário abre o app e entra):

```bash
TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
$TS status --json | python3 -c "import json,sys; print(json.load(sys.stdin)['Self']['DNSName'].rstrip('.'))"
```

Exemplo de saída: `macbook-pro.tail1234.ts.net`. Acrescentar ao `.env` (mantendo o que o setup escreveu):

```bash
printf 'HABBLAUD_REMOTE_ALLOW=permissions,messages\nHABBLAUD_ALLOWED_HOSTS=<nome>.ts.net\n' >> .env
grep -n "HABBLAUD_REMOTE_ALLOW\|HABBLAUD_ALLOWED_HOSTS\|HABBLAUD_REMOTE_PORT" .env
```

- [ ] **Step 3: Subir o Docker com a porta remota**

```bash
npm run docker:up -- --no-build
docker ps --format '{{.Names}} {{.Ports}}' | grep habblaud
```

Esperado: além de `127.0.0.1:4747->4747`, uma linha `0.0.0.0:443->4748` (ou `0.0.0.0:4748->4748`). Teste local do login:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://127.0.0.1:<porta-remota>/
```

Esperado: `200` (a página de login) ou `302`.

- [ ] **Step 4: Tailscale Serve (só o tailnet; nunca Funnel; nunca a 4747)**

```bash
TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
$TS serve --bg --https=443 https+insecure://127.0.0.1:<porta-remota>
$TS serve status
```

Esperado: `https://<nome>.ts.net (tailnet only)` → `https+insecure://127.0.0.1:<porta-remota>`. A configuração persiste entre reinícios do Mac.

- [ ] **Step 5: Teste de ponta a ponta no celular**

No celular com o Tailscale logado na mesma conta: abrir `https://<nome>.ts.net`. Esperado: página de login "Agentic Office", sem aviso de certificado (o Tailscale emite um válido). Entrar. O escritório abre; numa sessão do Claude Code no Mac, provocar um pedido de permissão (ex.: pedir para rodar um comando fora da allowlist) e aprovar pelo celular. Esperado: o terminal no Mac segue como aprovado.

- [ ] **Step 6: Registrar no spec o endereço e a porta usados**

Acrescentar ao fim de `docs/superpowers/specs/2026-10-22-agentic-office-rebrand-design.md`:

```markdown
## Como ficou (2026-10-22)

- Endereço: `https://<nome>.ts.net` (Tailscale Serve → porta remota <porta>, com login).
- `.env`: `HABBLAUD_REMOTE_ALLOW=permissions,messages`, `HABBLAUD_ALLOWED_HOSTS=<nome>.ts.net`.
- Desligar: `npm run remote:setup -- --off && npm run docker:up -- --no-build && tailscale serve reset`.
```

```bash
git add docs/superpowers/specs/2026-10-22-agentic-office-rebrand-design.md
git commit -m "Spec: como o acesso remoto ficou configurado

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Tarefa 10: Publicar o fork

**Files:**
- Nenhum. Toca: `origin` (GitHub), branch padrão do fork.

- [ ] **Step 1: Última verificação**

```bash
npm run typecheck && npm test && npm run i18n:check
git status --short     # vazio (o .env está no .gitignore)
git log --oneline upstream/main..HEAD
```

Esperado: a lista de commits deste plano (spec, andares, marca ×3, plugins, docs, spec final).

- [ ] **Step 2: Push (ação externa aprovada)**

```bash
git push -u origin agentic-office
```

- [ ] **Step 3: `main` do fork aponta para o trabalho**

```bash
git push origin agentic-office:main --force-with-lease=main:$(git rev-parse upstream/main)
gh repo edit stephanegaldino/agentic-office --default-branch main --description "Agentic Office: escritório virtual em pixel art dos seus agentes do Claude Code (fork do Habblaud)"
git branch --set-upstream-to=origin/main agentic-office
```

(`--force-with-lease` só sobrescreve se o `main` do fork ainda for igual ao `main` do original, que é o caso num fork recém-criado.)

- [ ] **Step 4: Conferir no GitHub**

```bash
gh repo view stephanegaldino/agentic-office --web
```

README com "Agentic Office" e o crédito; o banner "forked from marmottajr/habblaud" no topo. Para atualizar do original no futuro: `git fetch upstream && git merge upstream/main`.
