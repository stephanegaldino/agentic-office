# Agentic Office: fork do Habblaud com nome próprio e acesso remoto

Data: 2026-10-22. Autor: Stephane Galdino, com o Claude Code.

## Objetivo

Transformar o clone local do [Habblaud](https://github.com/marmottajr/habblaud) (escritório virtual dos agentes do
Claude Code) em um fork próprio chamado **Agentic Office**, hospedado em `github.com/stephanegaldino/agentic-office`,
e abri-lo num endereço próprio, acessível de qualquer aparelho do usuário, com login, mantendo a capacidade de
aprovar permissões e mandar mensagens aos agentes de fora do Mac.

Sucesso significa:

1. Abrir o escritório no celular pelo endereço `https://<nome-do-mac>.<tailnet>.ts.net`, entrar com usuário e senha, e
   aprovar uma permissão pedida por um agente que roda no Mac.
2. A tela, a página, os plugins, o comando do Claude Code e o README dizem "Agentic Office", com crédito ao Habblaud.
3. O fork continua conseguindo receber atualizações do original com `git fetch upstream` e merge.
4. `npm test` e `npm run typecheck` verdes; o `claude plugin validate --strict` passa nos três plugins.

## O que foi decidido (e o que fica fora)

| Decisão | Escolha |
| --- | --- |
| Nome | Agentic Office |
| Repositório | Fork oficial no GitHub, `stephanegaldino/agentic-office`, mantendo o vínculo com `marmottajr/habblaud` |
| Base de código | A 1.0.3 do original (`origin/main`, commit `faa1a01`), não a 0.7.0 do clone atual |
| Commit próprio "Prédio de vários andares" (`df47380`) | Portado para a 1.0.3, resolvendo os conflitos |
| Profundidade do rebrand | Só o que é visível. Identificadores técnicos ficam (ver lista abaixo) |
| Comando do Claude Code | `/habblaud` vira `/office` |
| Endereço | Tailscale Serve publicando a **porta remota com login** do próprio Habblaud (não a 4747) |
| Ações remotas | `HABBLAUD_REMOTE_ALLOW=permissions,messages`, mecanismo nativo da 1.0.x. Nenhuma alteração na trava de segurança |
| Habblaud World | Mantém o nome e continua ligado: é o serviço online do autor original, não o painel do usuário |
| Vercel | Fora. Não roda o servidor (ele lê `~/.claude` no Mac) e o usuário não quis um redirect |

### Fica como está, de propósito

Para que o merge com o original continue barato, estes nomes **não mudam**:

- `name: "habblaud"` no `package.json` (o `findRoot` em `server/config.ts` procura por ele);
- todas as variáveis `HABBLAUD_*`;
- a pasta `~/.habblaud` e o volume `habblaud-data`;
- os ids dos plugins e do marketplace (`habblaud`, `habblaud-permissoes`, `habblaud-mensagens`, `habblaud-codex`) e
  as pastas `mod/habblaud*`;
- nome do container, da imagem (`habblaud:local`) e do projeto do Compose;
- rotas HTTP, nomes de arquivos, classes CSS, identificadores no código;
- a pasta local `/Users/stephanegaldino/habblaud` (o marketplace em `~/.claude/settings.json` aponta para ela);
- o nome "Habblaud World" e `server.habblaud.com`.

## Arquitetura da mudança

### 1. Repositório

- No GitHub: `gh repo fork marmottajr/habblaud --fork-name agentic-office` cria o fork na conta `stephanegaldino`.
- No clone local: `origin` passa a apontar para `https://github.com/stephanegaldino/agentic-office.git`; um remote
  novo `upstream` aponta para `https://github.com/marmottajr/habblaud.git`.
- Branch de trabalho: `agentic-office`, criado a partir de `origin/main` (1.0.3). Ao final, vira o `main` do fork.
- O branch local `andares` (0.7.0 + o commit dos andares) fica guardado até o porte terminar; depois pode ser apagado.
- O `package.json` ganha `repository` e `homepage` do fork. Com isso o verificador de versão (`server/updates/checker.ts`)
  passa a olhar as releases do fork; avisos de versão nova do original passam a ser manuais (`git fetch upstream`).
- A versão continua `1.0.3`, para o merge futuro não brigar com o número. O `CHANGELOG.md` ganha uma seção
  "[Não lançado]" descrevendo o rebrand e o porte dos andares.
- Criar o fork e dar push são ações externas, aprovadas pelo usuário neste desenho.

### 2. Porte dos andares

O commit `df47380` (21 arquivos, +822/-295, todo em `client/src/world`) é aplicado sobre a 1.0.3 com `git cherry-pick`.
Conflitos esperados em quatro arquivos que o original também mudou desde a 0.7.0:

- `client/src/world/index.ts` (9 commits do original),
- `client/src/world/render/renderer.ts` (5),
- `client/src/world/social/social.ts` (4),
- `client/src/world/render/overlay.ts` (2).

Regra de resolução: o comportamento do original vale para tudo o que é da cidade (Habblaud World); o dos andares vale
para o layout do prédio local (recepção no térreo, salas empilhadas, elevadores entre andares, placa "Nº andar" nos
lobbies). Os testes do commit (`layout.test.ts`, `sim.test.ts`, `sim-pure.test.ts`) precisam passar depois do porte,
junto com a suíte inteira. O porte não toca `shared/world/` nem `server/world/`: o que sai para o Habblaud World
continua refletindo o escritório real (regra do `CLAUDE.md` do projeto).

### 3. Rebrand visível

Na 1.0.3 todo texto visível é escrito em português dentro de `tr()` (`shared/i18n.ts`), e a chave da tradução em
`shared/locales/{en,es,fr}.ts` é o próprio texto em português. Trocar o nome frase por frase mexeria em ~600 linhas
nos quatro idiomas, todas candidatas a conflito com o original. Em vez disso:

- **Camada de marca (`shared/brand.ts`):** exporta `BRAND = 'Agentic Office'` e `brand(text)`, que substitui a palavra
  inteira "Habblaud" (com H maiúsculo) por `BRAND`, exceto quando seguida de " World". O `tr()` aplica `brand()` ao
  texto já traduzido. Os dicionários, as chaves e os textos em português no código ficam iguais aos do original;
  `npm run i18n:check` continua passando sem mudanças. Testes em `shared/brand.test.ts` (substitui; preserva "Habblaud
  World", `habblaud.com`, `~/.habblaud`, `HABBLAUD_*`; e a integração no `tr()` nos quatro idiomas).
- **O que fica fora do `tr()` é editado à mão:** `client/index.html` (título, `og:*`, `twitter:*`); `BASE_TITLE` e o
  título da notificação em `client/src/ui/notify.ts`; a placa da recepção em `client/src/world/render/overlay.ts`; e o
  que mais o `git grep Habblaud -- client/src server` mostrar fora de `tr()` e de comentários.
- **Logotipo em pixels:** `WORDMARK_ROWS` em `client/src/ui/icons.ts` é redesenhado com o texto "Agentic Office" na mesma
  fonte bitmap, com `c` para "Agentic" e `t` para "Office". A placa física da recepção (`signage.png`) é regenerada por
  `scripts/assets/pixelart.py` com o texto novo, ou, se o script não rodar no Mac, o PNG antigo é retirado do manifesto
  para o cliente usar o desenho em código.
- **Plugins** (não usam o `shared/i18n`): `displayName`, `description` e `homepage` em `mod/*/.claude-plugin/plugin.json`;
  `description` e `owner` em `.claude-plugin/marketplace.json` (owner vira Stephane Galdino, com o crédito ao autor
  original na descrição); textos do `mod/habblaud/hooks/register.ts` (a saída vira `Agentic Office 1.0.3 em http://…`).
- **Comando:** `$.command.register({ name: 'office', … })` em `register.ts` e o `command.run` correspondente; os testes
  em `mod/habblaud/tests/habblaud.test.ts` e a documentação em `mod/README.md` acompanham.
- **Documentação:** `README.md` (inglês) ganha cabeçalho "Agentic Office", um parágrafo logo abaixo dizendo que é um
  fork do Habblaud de Márcio Junior, com link, e a instalação apontando para o fork. `README.pt-BR.md`, `README.es.md`
  e `README.fr.md` recebem o mesmo tratamento. `LICENSE` mantém o aviso MIT original e ganha uma linha de copyright do
  fork abaixo dele. `package.json` troca `description`, `repository` e `homepage`.
- **Mantém-se** qualquer "Habblaud" que seja identificador (ver lista acima) ou que se refira ao Habblaud World.

### 4. Acesso remoto

Tudo usa o que a 1.0.x já tem; nenhuma linha de segurança é alterada.

1. `npm run remote:setup`: pede usuário, senha e o nome do endereço. Grava só o hash da senha no `.env`, cria a CA local
   e o certificado em `~/.habblaud/remote-tls`, e deixa a porta remota (443, ou 4748 se a 443 estiver ocupada) para o
   `docker:up` publicar via `docker-compose.override.yml`.
2. `.env` recebe `HABBLAUD_REMOTE_ALLOW=permissions,messages` e `HABBLAUD_ALLOWED_HOSTS=<nome-do-mac>.<tailnet>.ts.net`.
3. `npm run docker:up` reconstrói a imagem na 1.0.3 com o rebrand e publica as duas portas: 4747 só em 127.0.0.1 e a
   remota conforme o setup.
4. Tailscale: o usuário entra no app (login interativo). Depois,
   `tailscale serve --bg --https=443 https+insecure://127.0.0.1:<porta-remota>` publica a porta remota no tailnet com
   certificado válido. Nunca a 4747. Sem Funnel: o endereço só existe para os aparelhos do tailnet.
5. No celular: abrir `https://<nome-do-mac>.<tailnet>.ts.net`, entrar com usuário e senha, aprovar uma permissão.

O terminal interativo nunca funciona pelo celular (regra do original). `spawn` e `terminal` ficam fora de
`HABBLAUD_REMOTE_ALLOW` até o usuário pedir.

### 5. Atualização do que está instalado

- `npm install` (a 1.0.3 tem dependências novas) e `npm run build`.
- `npm run docker:up` troca o container 0.7.0 pelo novo. O volume `habblaud-data` é o mesmo, então nomes dos personagens,
  linha do tempo e estatísticas continuam.
- `npm run mod:install` atualiza os plugins nas contas; nas sessões abertas, `/reload-plugins`. O comando `/office`
  passa a existir e `/habblaud` some.

## Tratamento de erros e riscos

- **Conflitos do cherry-pick maiores que o previsto:** o porte é uma tarefa isolada no plano; se não fechar, o fork
  segue sem os andares e o branch `andares` fica guardado. O usuário decide.
- **`pixelart.py` sem dependências no Mac:** cair no desenho em código (`WORDMARK`), que já é o fallback do cliente.
- **`i18n-check` reclamando de chave faltando:** rodar o script antes do commit do rebrand e corrigir os quatro idiomas.
- **Porta 443 ocupada no Mac:** o setup cai para 4748; o comando do `tailscale serve` aponta para a que o setup disser.
- **Tailscale sem login:** o passo 4 do acesso remoto espera o usuário; tudo o mais não depende dele.
- **Rebrand pegando identificador por engano:** a lista "Fica como está" é a referência; `npm test`, `typecheck` e
  `claude plugin validate --strict` nos três plugins são o guarda-corpo.

## Testes

- Suíte existente (`npm test`) e `npm run typecheck` depois de cada etapa: porte, rebrand, comando.
- Testes novos e atualizados: `shared/brand.test.ts` (camada de marca e integração no `tr()`),
  `mod/habblaud/tests/habblaud.test.ts` (`/office` e o texto novo), `client/src/ui/version.test.ts` e
  `server/updates/checker.test.ts` (repositório do fork).
- Validação manual: `claude plugin validate --strict` em `mod/habblaud`, `mod/habblaud-permissoes` e
  `mod/habblaud-mensagens`; `/office` numa sessão nova responde "Agentic Office 1.0.3 em http://localhost:4747".
- Validação de ponta a ponta: no celular, pelo endereço `.ts.net`, login e aprovação de uma permissão real.

## Ordem de execução sugerida

1. Fork no GitHub e remotes (externo, já aprovado).
2. Porte dos andares sobre a 1.0.3, testes verdes.
3. Rebrand: página e cliente; servidor; plugins e comando; documentação e licença.
4. Build, `docker:up`, `mod:install`, `/reload-plugins`; checagem do `/office`.
5. `remote:setup`, `.env`, `docker:up`, Tailscale Serve, teste no celular.
6. Push do branch, `main` do fork apontando para ele.
