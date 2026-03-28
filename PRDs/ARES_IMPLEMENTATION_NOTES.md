# ARES Implementation Notes: LLM-Powered Entity Extraction

This document provides detailed guidance on implementing the LLM-powered entity extraction feature for ARES.

---

## Overview

Entity extraction has two modes:

1. **Regex-based (fast, deterministic, no cost)**
   - Email regex patterns
   - Phone number patterns (intl)
   - @handle patterns (WhatsApp, Telegram, WeChat)
   - Wallet addresses (Ethereum, Bitcoin)

2. **LLM-powered (slower, more flexible, small cost)**
   - Uses Claude API to intelligently extract entities
   - Handles obfuscated/hidden contact info
   - Can infer entity types from context
   - More robust to formatting variations

The `EntityExtractor` service exposes both methods. Callers can choose which to use.

---

## LLM Extraction Implementation

### 1. API Choice: Claude vs Gemini

**Recommended: Anthropic Claude (claude-haiku-4.5)**

Rationale:
- Fast (haiku is 1 token/ms for most inputs)
- Cheap (~$0.08/1M input tokens)
- Very good at structured extraction (JSON output)
- Can be called from Node.js easily

Alternative: Google Gemini Flash (also good, but claude-haiku is more deterministic for JSON)

### 2. System Prompt

```
You are an entity extraction AI. Your job is to extract contact information and identifiers from raw text.

Given the following text, extract all:
- Emails (standard email format)
- Phone numbers (any format, any country)
- Messaging handles (WhatsApp, Telegram, WeChat, Signal, etc.)
- Cryptocurrency wallets (Bitcoin, Ethereum, etc.)
- URLs (skip http://, focus on standalone domains)

Return ONLY a valid JSON object (no other text) with this structure:
{
  "emails": ["email@example.com", ...],
  "phones": ["+1 206 123 4567", "+86 138 1234 5678", ...],
  "handles": [
    {"type": "whatsapp", "value": "+1 206 123 4567"},
    {"type": "telegram", "value": "@username"},
    {"type": "wechat", "value": "wechat_id"},
    {"type": "signal", "value": "+1 206 123 4567"}
  ],
  "wallets": [
    {"type": "ethereum", "value": "0xABC..."},
    {"type": "bitcoin", "value": "1A1z..."}
  ]
}

Important:
- If a phone number is associated with a platform (WhatsApp, Telegram), include it in handles
- Be lenient with formatting; normalize to standard forms (but preserve the value found)
- If you cannot extract something, return empty array
- If extraction fails entirely, return {"emails": [], "phones": [], "handles": [], "wallets": []}
```

### 3. API Call Implementation

```typescript
import Anthropic from "@anthropic-ai/sdk";

interface LLMExtractedEntities {
  emails: string[];
  phones: string[];
  handles: Array<{ type: string; value: string }>;
  wallets: Array<{ type: string; value: string }>;
}

async function extractEntitiesWithLLM(
  text: string
): Promise<LLMExtractedEntities> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Truncate text to avoid token limits
  const truncatedText = text.substring(0, 8000);

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract entities from this text:\n\n${truncatedText}`,
        },
      ],
      system: `You are an entity extraction AI. Your job is to extract contact information and identifiers from raw text.

Given text, extract all:
- Emails
- Phone numbers (any country)
- Messaging handles (WhatsApp, Telegram, WeChat)
- Cryptocurrency wallets

Return ONLY valid JSON:
{
  "emails": [...],
  "phones": [...],
  "handles": [{"type": "...", "value": "..."}],
  "wallets": [{"type": "...", "value": "..."}]
}

If none found, return empty arrays.`,
    });

    // Extract JSON from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.warn("No JSON found in LLM response:", responseText);
      return { emails: [], phones: [], handles: [], wallets: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as LLMExtractedEntities;

    // Validate structure
    return {
      emails: Array.isArray(parsed.emails) ? parsed.emails : [],
      phones: Array.isArray(parsed.phones) ? parsed.phones : [],
      handles: Array.isArray(parsed.handles) ? parsed.handles : [],
      wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
    };
  } catch (error) {
    console.error("LLM extraction failed:", error);
    // Graceful fallback: return empty results
    return { emails: [], phones: [], handles: [], wallets: [] };
  }
}
```

### 4. Integration in EntityExtractor

```typescript
class EntityExtractor {
  async extract(
    text: string,
    useLLM: boolean = false
  ): Promise<ExtractedEntities> {
    const startTime = Date.now();

    // Regex-based extraction (always fast)
    const regexResults = {
      emails: this.extractEmails(text),
      phones: this.extractPhones(text),
      handles: this.extractHandles(text),
      wallets: this.extractWallets(text),
    };

    // LLM-based extraction (optional)
    let llmResults: LLMExtractedEntities = {
      emails: [],
      phones: [],
      handles: [],
      wallets: [],
    };

    if (useLLM && text.length > 50) {
      // Only call LLM for non-trivial text
      llmResults = await extractEntitiesWithLLM(text);
    }

    // Merge results (deduplicate)
    const merged = this.mergeExtractionResults(regexResults, llmResults);

    return {
      ...merged,
      raw_extraction_time_ms: Date.now() - startTime,
    };
  }

  private mergeExtractionResults(
    regex: typeof regexResults,
    llm: LLMExtractedEntities
  ) {
    return {
      emails: [...new Set([...regex.emails, ...llm.emails])],
      phones: [...new Set([...regex.phones, ...llm.phones])],
      handles: [
        ...regex.handles,
        ...llm.handles.filter(
          (h) => !regex.handles.some((r) => r.value === h.value)
        ),
      ],
      wallets: [
        ...regex.wallets,
        ...llm.wallets.filter(
          (w) => !regex.wallets.some((r) => r.value === w.value)
        ),
      ],
    };
  }
}
```

### 5. Error Handling & Retry Logic

```typescript
async function extractEntitiesWithRetry(
  text: string,
  maxRetries: number = 2
): Promise<LLMExtractedEntities> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await extractEntitiesWithLLM(text);
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("LLM extraction failed after retries:", error);
        // Return empty results on final failure
        return { emails: [], phones: [], handles: [], wallets: [] };
      }

      // Exponential backoff
      const delayMs = Math.pow(2, attempt) * 100;
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
```

### 6. Cost Optimization

**Claude Haiku pricing** (~March 2026):
- Input: ~$0.80 per 1M tokens
- Output: ~$0.04 per 1M tokens

For typical page text (5000 chars ≈ 1250 tokens):
- Cost per extraction: ~$0.001 (one-tenth of a cent)
- 1000 extractions: ~$1

**Optimization strategies:**

1. **Smart LLM triggering**: Only call LLM if:
   - Regex extraction found < 1 entity, OR
   - Request explicitly asked for LLM (use_llm_extraction: true)

2. **Caching**: Store embedding + extraction results
   - If same text is extracted twice, use cached result
   - Hash text → check cache before LLM call

3. **Batch extraction**: Extract multiple sites in one request
   - Not recommended for MVP (complexity)
   - Future optimization

### 7. Testing LLM Extraction

```typescript
describe("EntityExtractor - LLM Mode", () => {
  it("extracts emails from obfuscated text", async () => {
    const extractor = new EntityExtractor();
    const text = "Contact us: email [at] example [dot] com";

    // Regex won't catch this; LLM will
    const result = await extractor.extract(text, true);

    expect(result.emails.length).toBeGreaterThan(0);
    expect(result.emails).toContain("email@example.com");
  });

  it("extracts WhatsApp numbers labeled as such", async () => {
    const extractor = new EntityExtractor();
    const text = "Chat with us on WhatsApp: +86-138-1234-5678 for support";

    const result = await extractor.extract(text, true);

    expect(result.phones).toContain("+86-138-1234-5678");
  });

  it("falls back gracefully on LLM failure", async () => {
    const extractor = new EntityExtractor();
    // Mock Anthropic API to throw error
    jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("API Error"));

    const result = await extractor.extract("some text", true);

    expect(result.emails).toEqual([]);
    expect(result.phones).toEqual([]);
  });
});
```

---

## Regex Patterns Reference

### Emails

```typescript
const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// More strict (RFC 5322 simplified)
const EMAIL_STRICT_REGEX =
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi;
```

### Phone Numbers (International)

```typescript
// Simple: +country_code + digits
const PHONE_SIMPLE_REGEX = /\+?[1-9]\d{1,14}/g;

// More patterns:
const PHONE_US_REGEX =
  /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

const PHONE_CHINA_REGEX = /\+?86[-.\s]?1[3-9]\d{2}[-.\s]?\d{4}[-.\s]?\d{4}/g;

const PHONE_EU_REGEX = /\+?(?:3[0-9]|4[0-9]|7[0-6])[-.\s]?\d{6,14}/g;

// Combine all
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+?[1-9]\d{1,14})/g;
```

### Handles (Telegram, WhatsApp, WeChat)

```typescript
// Telegram handles
const TELEGRAM_REGEX = /@[a-zA-Z0-9_]{5,32}/g;

// WeChat IDs (alphanumeric, underscore, dash)
const WECHAT_REGEX = /[Ww]e[Cc]hat[:\s]*([a-zA-Z0-9_-]{6,20})/g;

// WhatsApp (usually a phone or platform mention)
const WHATSAPP_REGEX =
  /[Ww]hats[Aa]pp[\s:]*(\+?[1-9]\d{1,14}|[a-zA-Z0-9._-]+)/g;

// Generic @mentions
const HANDLE_REGEX = /@[a-zA-Z0-9_]{3,}/g;
```

### Wallets

```typescript
// Ethereum (0x + 40 hex chars)
const ETHEREUM_REGEX = /0x[a-fA-F0-9]{40}/g;

// Bitcoin (P2PKH, P2SH, Bech32)
const BITCOIN_REGEX = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g;

// Generic hex (might be false positives)
const HEX_REGEX = /\b[a-fA-F0-9]{30,}\b/g;
```

---

## Configuration & Environment

### .env Variables

```bash
# LLM API Key (required for LLM extraction)
ANTHROPIC_API_KEY=sk-...

# Toggles (optional)
ENABLE_LLM_EXTRACTION=true
LLM_EXTRACTION_MAX_RETRIES=2

# Rate limiting (if needed)
LLM_EXTRACTION_RATE_LIMIT=100 # calls per minute
```

### Feature Flags in Code

```typescript
const FEATURES = {
  LLM_EXTRACTION_ENABLED:
    process.env.ENABLE_LLM_EXTRACTION === "true",
  LLM_EXTRACTION_MAX_RETRIES: parseInt(
    process.env.LLM_EXTRACTION_MAX_RETRIES || "2"
  ),
  REGEX_EXTRACTION_ENABLED: true, // always enabled
};
```

---

## Monitoring & Debugging

### Logging

```typescript
logger.info("Entity extraction started", {
  text_length: text.length,
  use_llm: useLLM,
});

logger.info("Regex extraction complete", {
  emails: results.emails.length,
  phones: results.phones.length,
});

if (useLLM) {
  logger.info("LLM extraction triggered", {
    request_tokens: estimatedTokens,
    expected_cost: estimatedCost,
  });
}

logger.info("Entity extraction complete", {
  total_entities: results.emails.length +
    results.phones.length +
    results.handles.length +
    results.wallets.length,
  execution_time_ms: results.raw_extraction_time_ms,
});
```

### Metrics

Track (for production):
- Avg extraction time (regex vs LLM)
- Entity counts by type
- LLM API call success rate
- Cost per extraction
- Cache hit rate

---

## Future Enhancements

1. **Advanced LLM features**:
   - Few-shot prompting (provide examples)
   - Obfuscated entity detection ("email [at] domain [dot] com")
   - Entity confidence scores
   - Named entity recognition (person names, company names)

2. **Performance**:
   - Batch processing multiple sites
   - Parallel LLM calls
   - Caching + deduplication

3. **Quality**:
   - A/B test regex vs LLM accuracy
   - Human feedback loop (mark false positives)
   - Fine-tuning LLM on ARES examples

4. **Cost**:
   - Use cheaper models (claude-3-haiku vs haiku-4.5)
   - Implement smart caching
   - Rate-limit aggressive LLM usage

---

## Decision: When to Use LLM

**Default (Regex only)**: Fast, free, deterministic
- Good for: API calls from AEGE or batch jobs
- Tradeoff: Misses obfuscated contact info

**Optional (Regex + LLM)**: Slower, $0.001 per call, more thorough
- Good for: Manual investigation, disputed cases, suspicious-looking sites
- Tradeoff: Added latency (~1–2 seconds), cost, rate limits

**Recommendation for hackathon MVP**:
- Expose `use_llm_extraction` flag in API
- Default to false (fast + free)
- Let users opt-in when they need deeper extraction
- In demo, show both modes working

This way you get the best of both worlds: speed by default, flexibility when needed.

---

## Summary

LLM-powered extraction is **optional** and **easy to add**:

1. Define system prompt (extract emails, phones, handles, wallets)
2. Call Claude Haiku API with user text
3. Parse JSON response
4. Merge with regex results
5. Return to caller

Cost: ~$0.001 per extraction. Speed: 0.5–2 seconds. Quality: Very high for edge cases.

For the hackathon, implement both regex and LLM, let users choose. This demonstrates:
- Intelligent use of LLMs (not just brute force)
- Cost awareness
- User control over accuracy vs speed tradeoff
