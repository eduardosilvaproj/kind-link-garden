# CLAUDE.md

Guia de contexto para Claude Code neste projeto.

## Stack
- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui
- Vitest para testes
- Lovable Cloud (Supabase) quando backend

## Comandos
```bash
npm install
npm run dev           # dev server (porta 8080)
npm run build
npm run preview
npm exec -- vitest run                                   # todos os testes
npm exec -- vitest run src/lib/__tests__/pdfParser.test.ts
npm run lint
```

## Estrutura
```
src/
  components/   # UI reutilizável (shadcn em components/ui)
  pages/        # rotas (Index.tsx, NotFound.tsx)
  lib/          # lógica pura (pdfParser, financeCalculations)
  hooks/        # hooks customizados
  data/         # dados/seeds (may2026Transactions, defaultConfig)
  types/        # tipos compartilhados
  __tests__/    # testes de integração
```

## Regras de estilo
- Usar tokens semânticos do `index.css` — nunca cores hardcoded (`text-white`, `bg-[#...]`).
- Componentes pequenos e focados; preferir composição.
- Edits cirúrgicos (search-replace), evitar reescritas amplas.
- Imports com alias `@/`.
- Sem comentários óbvios.

## Domínio (fatura C6)
- Parser: `src/lib/pdfParser.ts`; validado com `Fatura_25-05-2026-unlocked.pdf` (102 transações).
- Tipos: `Crédito`, `Estorno`, `Encargo Bancário`, `Pagamento`; demais = despesa.
- Maio 2026: `TOTAL_LIQUIDO_MAIO = 13681.47` é fixo, não recalcular.
- Distribuição por titular em maio é manual (via `edits`).

## Antes de finalizar
1. `npm exec -- vitest run`
2. `npm run build`
3. Conferir preview se mudou UI.
