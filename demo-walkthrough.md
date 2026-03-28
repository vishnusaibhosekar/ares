# ARES Demo Walkthrough

> **Duration**: ~5 minutes  
> **Purpose**: Demonstrate ARES (Actor Resolution & Entity Service) built with Qoder + Insforge

---

## Prerequisites

### Before Recording

- [ ] Terminal ready with ARES directory open
- [ ] VS Code/Qoder IDE open with project
- [ ] Browser ready (for frontend demo)
- [ ] Insforge CLI linked (`npx @insforge/cli current` shows project)

### Environment Setup

```bash
# Verify .env has all keys
cat .env | grep -E "INSFORGE|MIXEDBREAD|ANTHROPIC"
# Should show all 4 keys set
```

### Clear Previous Data

```bash
npx @insforge/cli db query "TRUNCATE sites, entities, clusters, cluster_memberships, embeddings, resolution_runs CASCADE;"
```

---

## Demo Script

### PART 1: Introduction (30 seconds)

**[Show: Slide or README]**

> "Hi, I'm [Name]. Today I'm demoing ARES — the Actor Resolution and Entity Service.
>
> ARES solves a real problem: when you find a counterfeit website, how do you know if it's connected to other scam sites? ARES automatically links sites by shared contact info — emails, phones, social handles.
>
> We built this in 6 hours using Qoder for agentic development and Insforge for the backend."

---

### PART 2: Architecture Overview (45 seconds)

**[Show: Terminal or diagram]**

> "Let me quickly show you the stack..."

```bash
# Show project structure
ls -la src/
```

> "We have:
> - **Express API** with 5 endpoints
> - **6 core services** including entity extraction and similarity scoring  
> - **Insforge** providing managed PostgreSQL with pgvector for embeddings
> - **React frontend** for visualization"

```bash
# Show Insforge connection
npx @insforge/cli current
```

> "Insforge handles our database — no infrastructure to manage."

---

### PART 3: Start the Application (30 seconds)

**[Action: Start servers]**

```bash
# Terminal 1: Start backend
npm run dev
```

**[Wait for startup message]**

> "Backend is running on port 3000..."

```bash
# Terminal 2: Start frontend
cd frontend && npm run dev
```

> "...and frontend on port 5173."

---

### PART 4: Health Check (20 seconds)

**[Action: Check health]**

```bash
curl -s http://localhost:3000/health | jq
```

**[Expected output]**
```json
{
  "status": "ok",
  "database": "connected",
  "embeddings": "configured",
  "llm": "configured"
}
```

> "All systems green. Database connected to Insforge, embeddings via Mixedbread AI, and optional LLM via Anthropic."

---

### PART 5: Seed Test Data (30 seconds)

**[Action: Seed database]**

```bash
curl -s -X POST http://localhost:3000/api/seeds | jq
```

**[Expected output]**
```json
{
  "sites_created": 12,
  "entities_created": 36,
  "clusters_created": 5
}
```

> "I've just seeded the database with 5 known operator clusters — think of these as known bad actors. 12 sites, each with shared contact information linking them together."

---

### PART 6: The Core Demo — Resolve a New Site (90 seconds)

**[Action: Ingest a suspicious site]**

> "Now here's the magic. Imagine we discover a new suspicious website. Let's see if it connects to any known operators..."

```bash
curl -s -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://new-replica-watches.cn",
    "page_text": "Contact us at shipping@luxeoutlet.cn or call +8613812345678. Follow @luxe_deals on Instagram. Returns within 14 days."
  }' | jq
```

**[Expected output]**
```json
{
  "actor_cluster_id": "...",
  "confidence": 1,
  "related_domains": ["fake-luxe.shop"],
  "matching_signals": ["exact_email", "exact_phone", "exact_handle"],
  "explanation": "Matched with high confidence (100.0%) based on matching email address, matching phone number, matching social media handle..."
}
```

> "**100% confidence match!** 
>
> ARES found that this new site shares an email, phone number, AND social handle with an existing cluster called 'Shenzhen Luxury Replica Syndicate'.
>
> This is powerful — a brand new domain, but we immediately know it's the same operator."

---

### PART 7: Show the Frontend (45 seconds)

**[Action: Open browser to http://localhost:5173]**

> "Let me show you the frontend..."

**[Navigate: Dashboard]**

> "The dashboard shows our system status and cluster overview."

**[Navigate: Ingest Site page]**

> "Here you can paste a URL and page content to ingest a new site..."

**[Navigate: Resolve Actor page]**

> "...and here's where analysts can run resolution queries to find operator connections."

---

### PART 8: How It Works (30 seconds)

**[Show: Code or architecture slide]**

> "Under the hood, ARES:
> 1. **Extracts entities** — emails, phones, handles, crypto wallets
> 2. **Normalizes them** — standardizes formats for comparison  
> 3. **Generates embeddings** — for semantic similarity on policy text
> 4. **Clusters sites** — using a union-find algorithm
> 5. **Returns matches** — with confidence scores and explanations"

---

### PART 9: The Qoder + Insforge Story (30 seconds)

> "What's special here is HOW we built this.
>
> **Qoder** autonomously scaffolded the entire service — reading specs from markdown files and building each phase: domain models, services, API routes, frontend.
>
> **Insforge** provided the backend primitives — managed Postgres with pgvector, no infrastructure setup needed.
>
> The result: a production-grade identity resolution system in 6 hours."

---

### PART 10: Wrap Up (15 seconds)

> "That's ARES — Actor Resolution made simple.
>
> Check out the repo, and thanks for watching!"

---

## Quick Reference Commands

### One-Liner Demo (if short on time)

```bash
# Full demo in one terminal session
curl -s http://localhost:3000/health | jq '.status'
curl -s -X POST http://localhost:3000/api/seeds | jq
curl -s -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{"url":"https://scam-site.cn","page_text":"Contact: shipping@luxeoutlet.cn +8613812345678"}' | jq
```

### Alternative Test Scenarios

**Match by email only:**
```bash
curl -s -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{"url":"https://another-fake.com","page_text":"Email us at support@techdeals.ua"}' | jq
```

**Match by phone only:**
```bash
curl -s -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cheap-electronics.store","page_text":"Call +380441234567 for orders"}' | jq
```

**No match (new operator):**
```bash
curl -s -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{"url":"https://totally-new-site.com","page_text":"Contact: newperson@gmail.com +15551234567"}' | jq
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Database not connected | Check `.env` has `INSFORGE_BASE_URL` and `INSFORGE_ANON_KEY` |
| Health check shows `llm: not_configured` | Add `ANTHROPIC_API_KEY` to `.env` (optional) |
| Seeds fail with conflict | Run the TRUNCATE command to clear data |
| Frontend not loading | Make sure `cd frontend && npm run dev` is running |

---

## Key Talking Points

1. **Problem**: Counterfeit sites hide behind new domains, but operators reuse contact info
2. **Solution**: ARES automatically links sites by shared entities
3. **Tech**: Built with Qoder (agentic dev) + Insforge (managed backend)
4. **Speed**: Production-grade system in 6 hours
5. **Result**: 100% confidence matches on shared email/phone/handle

---

*Good luck with your demo! 🎬*
