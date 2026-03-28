# ARES: Actor Resolution & Entity Service

## Overview

ARES identifies the operators behind counterfeit storefronts by linking domains, entities, and patterns. It uses entity extraction, embedding-based similarity matching, and clustering to resolve multiple storefronts to their underlying operators.

### Key Features

- **Site Ingestion**: Ingest storefront URLs with page content and extract entities
- **Entity Extraction**: Automatically detect emails, phones, social handles, and crypto wallets
- **Embedding Generation**: Generate semantic embeddings for similarity matching
- **Actor Resolution**: Cluster related sites and entities to identify common operators
- **API-First Design**: RESTful API for integration with existing systems

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- MIXEDBREAD_API_KEY (for embeddings)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Edit .env with your DATABASE_URL and MIXEDBREAD_API_KEY

# 4. Run database migrations
npm run db:migrate

# 5. Seed sample data (optional)
npm run db:seed

# 6. Start development server
npm run dev
```

Server will start on http://localhost:3000

---

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status and connectivity.

### Ingest Site

```http
POST /api/ingest-site
Content-Type: application/json

{
  "url": "https://example-store.com",
  "domain": "example-store.com",
  "page_text": "Contact us at support@example.com...",
  "entities": {
    "emails": ["support@example.com"],
    "phones": ["+15551234567"],
    "handles": [{"type": "telegram", "value": "@exampleshop"}]
  },
  "attempt_resolve": true
}
```

Ingest a new storefront and extract entities. Optionally attempt immediate resolution.

### Resolve Actor

```http
POST /api/resolve-actor
Content-Type: application/json

{
  "url": "https://suspicious-store.com",
  "entities": {
    "emails": ["support@example.com"]
  }
}
```

Resolve a site or entities to an existing actor cluster.

### Get Cluster Details

```http
GET /api/clusters/:id
```

Fetch detailed information about a cluster including all associated sites and entities.

---

## Frontend (UI)

The ARES frontend is a React application for visualizing and interacting with the resolution system.

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on http://localhost:5173 (Vite default).

### Pages

- **Dashboard** (`/`) - Overview of resolution activity and system health
- **Ingest Site** (`/ingest`) - Add a new suspicious storefront for analysis
- **Resolve Actor** (`/resolve`) - Resolve a site to an operator cluster
- **Cluster Details** (`/clusters/:id`) - View full cluster information

### Features

- Real-time form validation
- Loading states and spinners
- Error handling with user feedback
- Responsive design (mobile-friendly)
- Copy-to-clipboard for IDs
- Visual confidence indicators
- Risk score visualization

### Building for Production

```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

Built files in `frontend/dist/` ready for static hosting (Netlify, Vercel, S3, etc.).

---

## Project Structure

```
ares/
├── src/
│   ├── api/              # Express routes and middleware
│   │   ├── routes/       # Route handlers
│   │   ├── middleware/   # Auth, error handling
│   │   └── server.ts     # Express app configuration
│   ├── domain/           # Domain models and types
│   │   ├── models/       # Entity classes
│   │   ├── types/        # TypeScript types & API contracts
│   │   └── constants/    # Thresholds, patterns
│   ├── service/          # Business logic
│   │   ├── EntityExtractor.ts
│   │   ├── EmbeddingService.ts
│   │   ├── ClusterResolver.ts
│   │   └── ResolutionEngine.ts
│   ├── repository/       # Data access layer
│   │   ├── Database.ts   # PostgreSQL client
│   │   └── *Repository.ts
│   ├── util/             # Utilities (logger, validation, etc.)
│   └── index.ts          # Entry point
├── db/
│   ├── migrations/       # SQL migration files
│   ├── run-migrations.ts # Migration runner
│   └── seed.ts           # Seeding script
├── demos/                # Demo scripts and examples
├── tests/                # Unit and integration tests
└── package.json
```

---

## Development

### Scripts

```bash
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run start        # Run production build
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run typecheck    # Check types without emitting
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

### Database Operations

```bash
npm run db:migrate   # Run all migrations
npm run db:seed      # Seed sample data
npm run demo         # Run end-to-end demo
```

### Demo & Examples

The `demos/` folder contains example scripts:

```bash
# Run the end-to-end demo (requires backend running)
npm run demo

# Run cURL examples
chmod +x demos/curl-examples.sh
./demos/curl-examples.sh

# View sample API payloads
cat demos/sample-payloads.json | jq .
```

### Full Stack Demo

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run demo
npm run demo

# Visit http://localhost:5173 for the UI
```

---

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- path/to/test.ts
```

---

## Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
NODE_ENV=production npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | - | PostgreSQL connection string |
| MIXEDBREAD_API_KEY | Yes | - | API key for embeddings |
| NODE_ENV | No | development | Environment (development/production/test) |
| PORT | No | 3000 | Server port |
| LOG_LEVEL | No | info | Logging level |
| CORS_ORIGIN | No | * | Allowed CORS origins |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT

---

## Hackathon

Built for the **Insforge x Qoder Hackathon**
