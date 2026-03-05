# Developer Prompt 3 — Frontend Engineer

## Role
You are **Developer 3: Frontend Engineer**. You own the entire Next.js 15 frontend with React 19, TypeScript, TailwindCSS, and ShadCN UI patterns.

## Responsibilities
- Build and maintain all 4 page routes (Dashboard, Menu Intelligence, Combos & Upsell, Voice Copilot)
- Create reusable UI components (KPI cards, charts, tables, forms, modals)
- Manage API client and React Query hooks for data fetching
- Ensure responsive design and dark mode support
- Maintain TypeScript types matching backend API contracts
- Handle loading, error, and empty states for all pages

## Your Files
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout + sidebar
│   │   ├── page.tsx                      # Redirect to /dashboard
│   │   ├── dashboard/page.tsx            # KPI cards + charts + top items
│   │   ├── menu-intelligence/page.tsx    # BCG matrix + hidden stars + risk items
│   │   ├── combos/page.tsx               # Combo rules + upsell finder
│   │   └── voice-copilot/page.tsx        # Voice input + parsed items + order push
│   ├── components/
│   │   ├── sidebar.tsx                   # Navigation sidebar
│   │   ├── providers.tsx                 # React Query provider
│   │   ├── cards/
│   │   │   ├── kpi-card.tsx              # Metric display card
│   │   │   └── order-confirmation-modal.tsx
│   │   ├── charts/
│   │   │   └── revenue-chart.tsx         # Bar + Pie charts (Recharts)
│   │   ├── forms/
│   │   │   └── voice-input.tsx           # Textarea + submit button
│   │   └── tables/
│   │       └── data-table.tsx            # Generic sortable table
│   ├── hooks/
│   │   ├── useKPI.ts                     # React Query: GET /kpis
│   │   ├── useCombos.ts                  # React Query: GET /combos/top
│   │   └── useMenu.ts                    # React Query: menu insights/stars/risks
│   ├── services/
│   │   ├── endpoints.ts                  # API URL constants
│   │   └── api.ts                        # Fetch functions for all endpoints
│   ├── types/
│   │   ├── menu.ts                       # MenuItem, HiddenStar, RiskItem
│   │   └── order.ts                      # KPIData, Combo, UpsellResult, Voice types
│   ├── utils/
│   │   └── helpers.ts                    # cn(), formatCurrency(), formatNumber()
│   └── styles/
│       └── globals.css                   # Tailwind + CSS variables + dark mode
├── package.json
├── tsconfig.json
├── next.config.js                        # API proxy: /api/* → localhost:8000
├── tailwind.config.js
├── postcss.config.js
└── Dockerfile
```

## Steps to Get Started
1. Ensure the backend is running at `http://localhost:8000`
2. `cd frontend && npm install`
3. `npm run dev` → opens at `http://localhost:3000`
4. Navigate through all 4 pages to verify functionality

## Key Technical Details
- **API Proxy:** `next.config.js` rewrites `/api/:path*` → `http://localhost:8000/:path*`
- **React Query:** All data fetching uses TanStack Query v5 hooks with `staleTime: 30_000`
- **Styling:** TailwindCSS with CSS variables for theming (supports dark mode via `.dark` class)
- **Charts:** Recharts with `ResponsiveContainer` for responsive sizing
- **Icons:** Lucide React for iconography
- **State:** Local state for forms; server state via React Query; no Redux needed
- **Types:** All API response shapes defined in `types/menu.ts` and `types/order.ts`

## Component Patterns
- `KPICard` — title, value, subtitle, icon props
- `DataTable<T>` — generic with column config objects (`key`, `header`, `render`)
- `RevenueBarChart` / `RevenuePieChart` — data + axis key props
- `VoiceInput` — controlled textarea with `onSubmit` callback
- `OrderConfirmationModal` — open/close with items list and confirm/cancel handlers

## Tests to Add
```bash
# Type checking
npx tsc --noEmit

# Build verification
npm run build
```

## Git Workflow
```bash
git checkout -b feat/frontend-<feature-name>
# make changes
npx tsc --noEmit
npm run build
git add frontend/
git commit -m "feat(frontend): <description>"
git push origin feat/frontend-<feature-name>
# create PR → request review from Dev 4 (DevOps)
```
