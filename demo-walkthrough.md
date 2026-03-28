# ARES Demo Walkthrough — Frontend Edition

> **Duration**: ~5 minutes  
> **Purpose**: Demonstrate ARES (Actor Resolution & Entity Service) built with Qoder + Insforge  
> **Format**: 100% UI-based demo — no terminal commands shown

---

## Prerequisites

### Before Recording

- [ ] Backend running (`npm run dev` in background)
- [ ] Frontend running (`cd frontend && npm run dev` in background)
- [ ] Browser open to `http://localhost:5173`
- [ ] Database cleared of previous demo data (fresh start)

### Pre-Demo Setup (Off Camera)

```bash
# Terminal 1 - Start backend (minimize after starting)
npm run dev

# Terminal 2 - Start frontend (minimize after starting)
cd frontend && npm run dev

# Clear previous data
npx @insforge/cli db query "TRUNCATE sites, entities, clusters, cluster_memberships, embeddings, resolution_runs CASCADE;"
```

---

## Demo Script

### SCENE 1: Introduction (30 seconds)

**[Show: Browser at Dashboard — http://localhost:5173]**

> "Hi, I'm [Name]. Today I'm demoing ARES — the Actor Resolution and Entity Service.
>
> ARES solves a real problem: when you find a counterfeit website, how do you know if it's connected to other scam sites?
>
> ARES automatically links sites by shared contact info — emails, phones, and social handles.
>
> We built this in 6 hours using **Qoder** for agentic development and **Insforge** for the managed backend."

---

### SCENE 2: Dashboard Overview (30 seconds)

**[Show: Dashboard page]**

> "This is the ARES dashboard. You can see our system health at a glance:
>
> - **Database**: Connected to Insforge's managed PostgreSQL
> - **Embeddings**: Powered by Mixedbread AI for semantic similarity
> - **LLM**: Anthropic Claude for advanced entity extraction
>
> Right now, the database is empty. Let's populate it with some known threat actors."

---

### SCENE 3: Seed the Database (45 seconds)

**[Action: Click "Seed Database" button on Dashboard]**

> "I'll click 'Seed Database' to add our test data..."

**[Wait for success toast/notification]**

> "Done! We've just created:
> - **5 operator clusters** — these represent known bad actors
> - **12 scam websites** — each linked to a cluster
> - **36 entities** — emails, phone numbers, and social handles
>
> Think of these as our threat intelligence database. Real analysts would build this over time by investigating counterfeit sites."

**[Show: Dashboard now displays cluster count]**

---

### SCENE 4: Navigate to Resolve Actor (15 seconds)

**[Action: Click "Resolve Actor" in the navigation]**

> "Now let's use ARES for what it's built for — identifying unknown operators.
>
> I'll navigate to the Resolve Actor page..."

---

### SCENE 5: The Core Demo — Resolve a Suspicious Site (90 seconds)

**[Show: Resolve Actor page with empty form]**

> "Imagine we've just discovered a suspicious website selling counterfeit watches. We have the URL and some text from the page.
>
> Let me paste that in..."

**[Action: Fill in the form]**

| Field | Value |
|-------|-------|
| **Site URL** | `https://new-replica-watches.cn` |
| **Page Content** | `Contact us at shipping@luxeoutlet.cn or call +8613812345678. Follow @luxe_deals on Instagram. Returns within 14 days.` |

> "This looks like a typical counterfeit luxury goods site. Contact email, phone number, Instagram handle.
>
> Let's see if ARES can connect this to any known operators..."

**[Action: Click "Resolve Actor" button]**

**[Wait for results to appear]**

> "**Boom! 100% confidence match!**
>
> ARES found that this brand-new website is connected to an existing cluster — the 'Shenzhen Luxury Replica Syndicate'.
>
> Look at the matching signals:
> - **Exact email match**: `shipping@luxeoutlet.cn`
> - **Exact phone match**: `+8613812345678`  
> - **Exact handle match**: `@luxe_deals`
>
> Three independent signals all pointing to the same operator. This isn't a coincidence."

---

### SCENE 6: View Cluster Details (45 seconds)

**[Action: Click on the matched cluster link/card]**

> "Let me click into this cluster to see more details..."

**[Show: Cluster Details page]**

> "Here's everything we know about this operator:
>
> - **Related domains**: All the sites we've previously linked to this cluster
> - **Shared entities**: The contact information that connects them
> - **Timeline**: When each site was discovered
>
> Every time we find a new site with matching contact info, it automatically gets linked here."

---

### SCENE 7: Try Another Resolution (45 seconds)

**[Action: Navigate back to Resolve Actor]**

> "Let's try another example — this time with just a phone number..."

**[Action: Fill in the form]**

| Field | Value |
|-------|-------|
| **Site URL** | `https://cheap-electronics.store` |
| **Page Content** | `Call +380441234567 for orders. Fast shipping to Europe!` |

**[Action: Click "Resolve Actor" button]**

> "Another match! This time it's the 'Eastern Europe Dropship Network'.
>
> Just one phone number was enough to identify the operator. That's the power of entity-based resolution."

---

### SCENE 8: Show a No-Match Scenario (30 seconds)

**[Action: Fill in the form with new data]**

| Field | Value |
|-------|-------|
| **Site URL** | `https://totally-new-scam.com` |
| **Page Content** | `Contact: unknownperson@protonmail.com` |

**[Action: Click "Resolve Actor" button]**

> "This time... no match found.
>
> ARES has created a new cluster for this unknown operator. As we discover more sites, if any share this email address, they'll automatically be linked together.
>
> The system learns and grows over time."

---

### SCENE 9: Ingest a New Site (Optional - 30 seconds)

**[Action: Navigate to "Ingest Site" page]**

> "There's also a dedicated page for just ingesting sites without resolution.
>
> Analysts can bulk-add sites to the database, extract their entities, and build the threat intelligence graph."

**[Show: Ingest Site form]**

---

### SCENE 10: How We Built This (30 seconds)

**[Show: Dashboard or architecture view]**

> "What's special here is HOW we built this.
>
> **Qoder** autonomously scaffolded the entire service — domain models, services, API routes, and this React frontend — all from markdown specs.
>
> **Insforge** provided the backend primitives — managed Postgres with pgvector for embeddings, no infrastructure setup needed.
>
> The result: a production-grade identity resolution system in **6 hours**."

---

### SCENE 11: Wrap Up (15 seconds)

**[Show: Dashboard with populated data]**

> "That's ARES — Actor Resolution made simple.
>
> Find a suspicious site, paste in its content, and instantly know if it's connected to known threat actors.
>
> Thanks for watching!"

---

## Test Data Reference

### Known Clusters in Seed Data

| Cluster Name | Related Domains | Key Entities |
|--------------|-----------------|-------------|
| Shenzhen Luxury Replica Syndicate | fake-luxe.shop | shipping@luxeoutlet.cn, +8613812345678, @luxe_deals |
| Eastern Europe Dropship Network | tech-bargains.ua | support@techdeals.ua, +380441234567 |
| Southeast Asia Counterfeit Ring | cheap-goods.ph | orders@bargainworld.ph, +639123456789 |
| Crypto Scam Collective | nft-deals.io | support@cryptodeals.io, @crypto_offers |
| Generic Fraud Network | scam-deals.com | contact@genericfraud.com |

### Demo Scenarios

**Scenario 1: Multi-Signal Match (100% confidence)**
- URL: `https://new-replica-watches.cn`
- Content: `Contact us at shipping@luxeoutlet.cn or call +8613812345678. Follow @luxe_deals on Instagram.`
- Expected: Match to "Shenzhen Luxury Replica Syndicate"

**Scenario 2: Single Signal Match (High confidence)**
- URL: `https://cheap-electronics.store`
- Content: `Call +380441234567 for orders`
- Expected: Match to "Eastern Europe Dropship Network"

**Scenario 3: Email-Only Match**
- URL: `https://another-fake.com`
- Content: `Email us at support@techdeals.ua`
- Expected: Match to "Eastern Europe Dropship Network"

**Scenario 4: No Match (New Operator)**
- URL: `https://totally-new-site.com`
- Content: `Contact: newperson@gmail.com +15551234567`
- Expected: No match, new cluster created

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Dashboard shows "Database: disconnected" | Check backend is running on port 3000 |
| "Failed to fetch" errors | Backend not running or CORS issue |
| Seed button not working | Check `.env` has valid Insforge credentials |
| No matches found for known entities | Database might be empty — click Seed first |
| Page not loading | Frontend not running — `cd frontend && npm run dev` |

---

## Key Talking Points

1. **Problem**: Counterfeit sites hide behind new domains, but operators reuse contact info
2. **Solution**: ARES automatically links sites by shared entities (emails, phones, handles)
3. **Demo flow**: Seed data → Resolve suspicious site → See instant match
4. **Tech**: Built with Qoder (agentic dev) + Insforge (managed backend)
5. **Speed**: Production-grade system in 6 hours
6. **Result**: 100% confidence matches on shared identifiers

---

## Recording Tips

- **Browser**: Use a clean browser profile or incognito mode
- **Resolution**: 1920x1080 works well for screen recording
- **Zoom**: Consider zooming browser to 110-125% for readability
- **Mouse**: Move slowly, pause briefly before clicking
- **Forms**: Type slowly or paste deliberately — let viewers follow
- **Pauses**: Brief pauses after results appear help comprehension

---

*Good luck with your demo! 🎬*
