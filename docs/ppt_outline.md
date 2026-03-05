# PPT Outline — PetPooja AI Revenue Copilot

## Slide 1 — Title
- **PetPooja AI Revenue Copilot**
- Tagline: "AI-powered revenue intelligence for restaurants"

## Slide 2 — Problem Statement
- Restaurant owners lack data-driven menu insights
- Combo / upsell decisions are gut-feel
- Order entry is slow and error-prone

## Slide 3 — Solution Overview
- Four pillars: Revenue Intelligence · Combo Engine · Voice Copilot · PoS Integration
- Architecture diagram (see `docs/architecture.md`)

## Slide 4 — Revenue Intelligence
- Contribution margin calculation
- BCG-style quadrant: Star / Puzzle / Plow Horse / Dog
- Hidden stars = promotion opportunities
- Risk items = candidates for menu removal

## Slide 5 — Combo Engine
- Market basket analysis on order history (mlxtend apriori)
- Association rule mining (support / confidence / lift)
- Dual upsell strategy: combo-based + hidden star promotion

## Slide 6 — Voice Copilot
- Natural language → structured order
- Multilingual support (English + Hindi + Hinglish)
- RapidFuzz-powered menu matching with confidence scores

## Slide 7 — PoS Integration
- JSON order payload generation with line item details
- Confirmation modal before push
- Ready for real PoS APIs

## Slide 8 — Tech Stack
- **Backend:** FastAPI · pandas · RapidFuzz · mlxtend
- **Frontend:** Next.js 15 · React 19 · TypeScript · TailwindCSS · ShadCN UI
- **Data:** 5-sheet Excel (Menu_Items, Orders, Order_Items, Sales_Analytics, Voice_Orders)
- **DevOps:** Docker · GitHub Actions · Makefile

## Slide 9 — Live Demo
- Dashboard → Menu Intel → Combos & Upsell → Voice Copilot
- (Follow `docs/demo_script.md`)

## Slide 10 — Roadmap / Bonus
- Modifier parsing ("extra cheese", "no onion")
- Inventory-aware upselling
- KOT generation
- Speech-to-text (Whisper integration)
- Real-time WebSocket order updates

## Slide 11 — Thank You / Q&A
