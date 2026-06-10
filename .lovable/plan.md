
# MedCase Daily — Monetização + Pronto Socorro

Mantém todo o design atual (dark, minimalista, mobile-first). Sem login, sem assinatura, sem ranking.

## 1. Banco de dados (Lovable Cloud, no lugar do Firebase)

Duas novas tabelas:

**`premium_codes`**
- `code` (texto, único) — ex: `MED-48291`
- `active` (boolean) — admin liga/desliga
- `type` (texto) — `full_access`
- `expires_at` (timestamp, nullable)
- RLS: leitura pública apenas para validar código; escrita só via server function admin

**`emergency_cases`**
- `id`, `date` (opcional, para agendar), `question`, `options` (jsonb, 5 itens), `correct_answer`
- Vai compor a sessão diária de 10 casos do Pronto Socorro
- RLS: leitura pública; escrita só via admin

A tabela `daily_cases` existente continua igual e cobre Clínica/Pediatria/GO.

## 2. Sistema premium (sem login)

- Novo arquivo `src/lib/premium.ts` com:
  - `isPremiumUnlocked()` — lê LocalStorage (`medcase:premium = true`)
  - `unlockWithCode(code)` — chama server function que valida no banco
  - Server function `validatePremiumCode` em `src/lib/premium.functions.ts` — consulta `premium_codes`, retorna `{ ok: true }` se `active=true` e (sem expiração ou ainda válido)
- Modos premium: **Pediatria, GO, Pronto Socorro**. Clínica continua grátis.
- Home (`index.tsx`): cards dos modos premium recebem ícone de cadeado quando bloqueado; clicar abre modal de desbloqueio.
- Modal `PremiumModal`:
  - título "Desbloqueie os modos premium do MedCase Daily"
  - lista curta de benefícios (3 bullets)
  - input do código + botão "Desbloquear acesso"
  - feedback (toast) de sucesso/erro
  - ao desbloquear: salva LocalStorage e fecha
- Rota `/jogar/$mode` checa `isPremiumUnlocked()` para modos premium; se não, redireciona pra home.

## 3. Novo modo Pronto Socorro

Nova rota `src/routes/ps.tsx` (separada de `/jogar/$mode` por ter mecânica diferente):

**Fluxo**
- Loader carrega 10 casos de `emergency_cases` (mais recentes ou aleatórios determinísticos do dia)
- Estado: caso atual (1–10), acertos, tempo restante
- Cada caso: pergunta curta no topo, 5 botões de conduta abaixo
- Timer de 30s por caso, visível e grande no topo:
  - barra de progresso + número
  - cor normal → cor de alerta nos últimos 10s (token `--destructive`)
  - ao zerar: conta como erro, avança automaticamente
- Resposta (clique ou timeout): feedback rápido (~400ms verde/vermelho) e avança
- Sem etapa de exame — escolha direta da conduta

**Tela final**
- "X/10 casos corretos" + percentual
- Botões: Compartilhar (`🚑 PS: 8/10 · MedCase Daily #N`) e Voltar
- Salva resultado em LocalStorage (`medcase:ps:lastScore`)

## 4. Painel admin (`/admin`)

Mantém o que existe e adiciona duas abas (tabs simples no topo):

- **Casos clínicos** — o que já existe (clínica/pediatria/GO)
- **Pronto Socorro** — listar, criar, editar, excluir `emergency_cases`
- **Códigos premium** — listar, gerar novo código (botão "Gerar código" cria com slug aleatório `MED-XXXXX`), toggle ativo/inativo, excluir

Novas server functions admin (todas protegidas por `ADMIN_PASSWORD`):
- `adminListEmergencyCases`, `adminUpsertEmergencyCase`, `adminDeleteEmergencyCase`
- `adminListPremiumCodes`, `adminCreatePremiumCode`, `adminTogglePremiumCode`, `adminDeletePremiumCode`

## 5. Compartilhamento

- Modos diários: continua `⭐⭐⭐ MedCase Daily #N`
- Pronto Socorro: `🚑 PS: 8/10 · MedCase Daily #N`

## 6. Arquivos afetados

```text
NOVOS
  supabase/migrations/<novo>.sql       tabelas premium_codes + emergency_cases
  src/lib/premium.ts                   helpers LocalStorage
  src/lib/premium.functions.ts         validatePremiumCode + admin codes
  src/lib/emergency.functions.ts       get + admin emergency_cases
  src/components/PremiumModal.tsx      modal de desbloqueio
  src/routes/ps.tsx                    novo modo Pronto Socorro

EDITADOS
  src/routes/index.tsx                 cadeados nos modos premium + modal
  src/routes/jogar.$mode.tsx           guard premium
  src/routes/admin.tsx                 tabs + CRUD novas tabelas
  src/lib/game.ts                      adicionar mode "emergency" no MODES
```

Posso seguir?
