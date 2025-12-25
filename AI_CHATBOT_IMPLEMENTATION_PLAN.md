# AI Chatbot Implementation Plan

## Overview

This document outlines the implementation plan for adding an AI-powered chatbot to PropVestor that can query and interact with all integrated data sources.

## Current Implementation Status

- ✅ `/api/chat` endpoint (org-scoped, authenticated)
- ✅ Ops assistant rule-based intent routing
- ✅ KPI summary, work orders, delinquency, expiring leases, recent payments, properties
- ✅ Tenant status summary
- ✅ Vendor list
- ✅ HOA fees status + overdue list
- ✅ Reconciliation status summary
- ✅ Floating chat overlay UI in the web app
- ⏳ Chat history storage (ChatSession/ChatMessage models)
- ⏳ LLM provider integration and tool/function calling
- ⏳ RAG/document retrieval and embeddings

## Architecture

### High-Level Architecture

```
Frontend (React/Next.js)
    ↓
Chat API Endpoint (/api/chat)
    ↓
AI Service Layer
    ├── LLM Provider (OpenAI/Anthropic)
    ├── RAG System (Retrieval Augmented Generation)
    └── Data Source Connectors
        ├── PostgreSQL (via Prisma)
        ├── Stripe API
        ├── Google Cloud Storage
        ├── RentSpree API
        ├── DocuSign API
        └── Email Service
```

## Required Components

### 1. Backend Components

#### A. Chat API Endpoint (`apps/api/src/routes/chat.ts`)
- **POST `/api/chat`**: Main chat endpoint
- **GET `/api/chat/history`**: Retrieve chat history
- **DELETE `/api/chat/history/:id`**: Clear chat history
- Authentication: Requires user to be logged in
- Organization scoping: All queries scoped to user's active organization

#### B. AI Service Layer (`apps/api/src/lib/ai/`)
- **`llm.ts`**: LLM provider integration (OpenAI/Anthropic)
- **`rag.ts`**: RAG system for retrieving relevant context
- **`prompts.ts`**: System prompts and prompt templates
- **`embeddings.ts`**: Text embedding generation for semantic search

#### C. Data Source Connectors (`apps/api/src/lib/ai/connectors/`)
- **`postgres-connector.ts`**: Query PostgreSQL via Prisma
- **`stripe-connector.ts`**: Query Stripe API
- **`gcs-connector.ts`**: Query Google Cloud Storage metadata
- **`rentspree-connector.ts`**: Query RentSpree API
- **`docusign-connector.ts`**: Query DocuSign API
- **`email-connector.ts`**: Query email service logs/metadata

#### D. Chat History Storage
- **New Prisma Model**: `ChatMessage` and `ChatSession`
- Store conversation history per user/organization
- Enable context retention across sessions

### 2. Frontend Components

#### A. Chat UI Component (`apps/web/src/components/ChatBot.tsx`)
- Chat interface with message history
- Input field for user queries
- Loading states and error handling
- Integration with existing design system

#### B. Chat Page/Widget
- Option 1: Full page (`/chat`)
- Option 2: Floating widget (bottom-right corner)
- Option 3: Sidebar panel

### 3. Database Schema

```prisma
model ChatSession {
  id             String        @id @default(uuid()) @db.Uuid
  organizationId String        @db.Uuid
  userId         String        @db.Uuid
  title          String?       // Auto-generated from first message
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id])
  user           User          @relation(fields: [userId], references: [id])
  messages       ChatMessage[]

  @@index([organizationId, userId])
}

model ChatMessage {
  id          String       @id @default(uuid()) @db.Uuid
  sessionId   String       @db.Uuid
  role        String       // 'user' | 'assistant' | 'system'
  content     String       @db.Text
  metadata    Json?        // Store tool calls, data sources used, etc.
  createdAt   DateTime     @default(now())

  session     ChatSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

## Data Sources Integration

### 1. PostgreSQL (Primary Database)
**What it can query:**
- Properties, Units, Tenants, Leases
- Work Orders, Vendors
- Payments, Charges
- Documents
- Users, Organizations
- Screening Requests

**How:**
- Use Prisma ORM to query database
- Generate SQL-like queries from natural language
- Apply organization scoping automatically

**Example queries:**
- "Show me all active leases"
- "What's the total rent collected this month?"
- "List all work orders for property X"

### 2. Stripe API
**What it can query:**
- Payment methods
- Payment intents
- Customer information
- Transaction history
- Subscription status

**How:**
- Use existing Stripe integration (`apps/api/src/lib/stripe.ts`)
- Query Stripe API for payment-related information
- Map Stripe data to internal models

**Example queries:**
- "Show payment methods for tenant X"
- "What's the status of payment Y?"
- "List all failed payments this month"

### 3. Google Cloud Storage
**What it can query:**
- Document metadata
- File listings
- Signed URLs (for document access)
- Storage usage

**How:**
- Use existing GCS integration (`apps/api/src/lib/storage.ts`)
- Query file metadata and listings
- Provide document links when relevant

**Example queries:**
- "Show all lease documents"
- "Find documents for property X"
- "List all uploaded files this month"

### 4. RentSpree API
**What it can query:**
- Screening request status
- Application details
- Credit scores, income verification
- Screening reports

**How:**
- Use existing RentSpree integration (`apps/api/src/lib/rentspree.ts`)
- Query screening data for tenants
- Provide screening summaries

**Example queries:**
- "What's the screening status for tenant X?"
- "Show screening results for applicant Y"
- "List all pending screenings"

### 5. DocuSign API
**What it can query:**
- Envelope status
- Signature status
- Document completion
- Signing history

**How:**
- Use existing DocuSign integration (`apps/api/src/lib/docusign.ts`)
- Query envelope and document status

**Example queries:**
- "What's the status of lease document X?"
- "Show all unsigned leases"
- "List completed signatures this month"

### 6. Email Service
**What it can query:**
- Email logs (if stored)
- Email templates
- Sent email history

**How:**
- Query email service logs/metadata
- Provide email history when relevant

## Implementation Steps

### Phase 1: Foundation (Week 1-2)
1. **Set up LLM Provider**
   - Choose provider (OpenAI GPT-4, Anthropic Claude, etc.)
   - Set up API keys and configuration
   - Create `apps/api/src/lib/ai/llm.ts`

2. **Database Schema**
   - Add `ChatSession` and `ChatMessage` models to Prisma schema
   - Run migrations
   - Update Prisma client

3. **Basic Chat API**
   - Create `/api/chat` endpoint
   - Implement basic chat functionality (no data sources yet)
   - Store chat history

### Phase 2: RAG System (Week 2-3)
1. **Embeddings Setup**
   - Set up embeddings provider (OpenAI embeddings, or vector DB)
   - Create `apps/api/src/lib/ai/embeddings.ts`

2. **Context Retrieval**
   - Implement semantic search for relevant data
   - Create `apps/api/src/lib/ai/rag.ts`
   - Index common queries and responses

3. **Prompt Engineering**
   - Create system prompts
   - Define chat persona and capabilities
   - Create `apps/api/src/lib/ai/prompts.ts`

### Phase 3: Data Source Connectors (Week 3-4)
1. **PostgreSQL Connector**
   - Implement natural language to Prisma query conversion
   - Create `apps/api/src/lib/ai/connectors/postgres-connector.ts`
   - Add organization scoping

2. **Stripe Connector**
   - Implement Stripe API queries
   - Create `apps/api/src/lib/ai/connectors/stripe-connector.ts`

3. **GCS Connector**
   - Implement GCS metadata queries
   - Create `apps/api/src/lib/ai/connectors/gcs-connector.ts`

4. **RentSpree Connector**
   - Implement RentSpree API queries
   - Create `apps/api/src/lib/ai/connectors/rentspree-connector.ts`

5. **DocuSign Connector**
   - Implement DocuSign API queries
   - Create `apps/api/src/lib/ai/connectors/docusign-connector.ts`

### Phase 4: Tool Calling / Function Calling (Week 4-5)
1. **Tool Definitions**
   - Define available tools/functions for LLM
   - Map tools to data source connectors

2. **Tool Execution**
   - Implement tool calling mechanism
   - Execute tools and return results to LLM
   - Handle errors gracefully

### Phase 5: Frontend (Week 5-6)
1. **Chat UI Component**
   - Create `apps/web/src/components/ChatBot.tsx`
   - Implement message display, input, and history
   - Add loading states and error handling

2. **Chat Integration**
   - Add chat to navigation/sidebar
   - Create chat page or widget
   - Integrate with existing design system

3. **Real-time Updates**
   - Optional: WebSocket for real-time responses
   - Or: Polling for long-running queries

### Phase 6: Security & Optimization (Week 6-7)
1. **Security**
   - Ensure all queries are organization-scoped
   - Rate limiting for chat endpoints
   - Input sanitization and validation
   - Prevent SQL injection and other attacks

2. **Performance**
   - Caching for common queries
   - Optimize LLM API calls
   - Implement streaming responses (optional)

3. **Error Handling**
   - Graceful error messages
   - Fallback responses
   - Logging and monitoring

## Technology Stack

### LLM Provider Options
1. **OpenAI GPT-4**
   - Pros: Best performance, function calling support
   - Cons: Cost, rate limits
   - Cost: ~$0.03-0.06 per 1K tokens

2. **Anthropic Claude**
   - Pros: Good performance, long context windows
   - Cons: Cost, newer API
   - Cost: ~$0.015-0.03 per 1K tokens

3. **Open Source (Llama 2, Mistral)**
   - Pros: No API costs, full control
   - Cons: Requires infrastructure, lower performance
   - Cost: Infrastructure only

### Vector Database (Optional, for RAG)
1. **Pinecone** - Managed vector DB
2. **Weaviate** - Self-hosted or managed
3. **PostgreSQL with pgvector** - Use existing DB

### Recommended Stack
- **LLM**: OpenAI GPT-4 (for function calling support)
- **Embeddings**: OpenAI embeddings API
- **Vector DB**: PostgreSQL with pgvector (use existing infrastructure)
- **Backend**: Node.js/TypeScript (existing)
- **Frontend**: React/Next.js (existing)

## Environment Variables

```env
# AI/LLM Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo for cost savings
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional: Vector DB
VECTOR_DB_URL=...  # If using external vector DB

# Chat Configuration
CHAT_MAX_HISTORY=50  # Max messages per session
CHAT_MAX_TOKENS=4000  # Max tokens per request
CHAT_TEMPERATURE=0.7  # Creativity level (0-1)
```

## Security Considerations

1. **Organization Scoping**
   - All queries must be scoped to user's active organization
   - Never expose data from other organizations

2. **Input Validation**
   - Sanitize user inputs
   - Prevent prompt injection attacks
   - Rate limit requests

3. **Data Privacy**
   - Don't log sensitive data (SSNs, payment info)
   - Encrypt chat history if needed
   - Comply with data retention policies

4. **API Key Security**
   - Store LLM API keys securely
   - Use environment variables
   - Rotate keys regularly

## Cost Estimation

### Monthly Costs (Example: 1000 queries/day)
- **OpenAI GPT-4**: ~$300-600/month
- **OpenAI GPT-3.5**: ~$50-100/month
- **Embeddings**: ~$10-20/month
- **Vector DB**: $0 (if using PostgreSQL with pgvector)

**Total**: ~$60-620/month depending on model choice

### Cost Optimization
- Use GPT-3.5 for simple queries, GPT-4 for complex ones
- Cache common queries
- Implement query batching
- Use streaming to reduce latency

## Example User Interactions

### Query 1: Property Information
**User**: "Show me all properties in downtown"

**AI Process**:
1. Parse query → Identify: properties, location filter
2. Query PostgreSQL → `SELECT * FROM Property WHERE address LIKE '%downtown%' AND organizationId = ?`
3. Format results → Return property list with details

**Response**: "I found 3 properties in downtown: [list with details]"

### Query 2: Payment Status
**User**: "What's the payment status for tenant John Doe?"

**AI Process**:
1. Parse query → Identify: tenant name, payment status
2. Query PostgreSQL → Find tenant by name
3. Query Stripe API → Get payment methods and status
4. Format results → Return payment information

**Response**: "John Doe has 2 payment methods: [details]. Last payment: [date, amount, status]"

### Query 3: Work Orders
**User**: "Show me all open work orders for HVAC issues"

**AI Process**:
1. Parse query → Identify: work orders, status=open, category=HVAC
2. Query PostgreSQL → `SELECT * FROM WorkOrder WHERE status = 'OPEN' AND category = 'HVAC' AND organizationId = ?`
3. Format results → Return work order list

**Response**: "I found 5 open HVAC work orders: [list with details]"

## Next Steps

1. **Decision**: Choose LLM provider (OpenAI recommended)
2. **Setup**: Get API keys and configure environment
3. **Phase 1**: Implement basic chat functionality
4. **Iterate**: Add data sources one by one
5. **Test**: Thoroughly test with real queries
6. **Deploy**: Roll out gradually with monitoring

## Additional Features (Future)

- **Voice Input**: Speech-to-text for queries
- **Multi-language Support**: Support multiple languages
- **Analytics**: Track common queries, user satisfaction
- **Custom Training**: Fine-tune model on PropVestor-specific data
- **Proactive Alerts**: AI suggests actions based on data patterns
- **Document Q&A**: Answer questions about uploaded documents
