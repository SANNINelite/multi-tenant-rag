# Multi-Tenant RAG SaaS Platform
## Professional Project Documentation & System Architecture Report

Welcome to the official, technical system documentation for the **Multi-Tenant Retrieval-Augmented Generation (RAG) SaaS Platform**. This document details the exact, current, fully functional, and deployed implementation of the system. It covers data isolation, authentication, processing pipelines, retrieval algorithms, deployment configurations, and complete visual diagrams mapped out in Mermaid syntax.

---

## 1. Executive Summary & Overview

The **Multi-Tenant RAG SaaS Platform** is a secure, cloud-deployed, enterprise-grade application enabling multiple organizations (tenants/workspaces) to upload proprietary document libraries (PDF format), ingest and extract text contents, generate semantic vector embeddings, store them in a secure relational database, and conduct natural language conversations with an AI assistant that answers questions based solely on the uploaded documents.

### High-Level Architecture
* **Frontend Application:** Deployed on **Vercel** (React + Vite + Axios + React Router)
* **Backend Application:** Deployed on **Render** (Node.js + Express + TypeScript)
* **Database Layer:** Hosted on **Neon PostgreSQL** (Relational schemas managed via Prisma ORM)
* **AI Provider Services:** **Google Gemini API** (using `gemini-embedding-004` and `gemini-1.5-flash`)
* **Security & Authentication:** Hashed passwords (`bcryptjs`) & Stateless session JSON Web Tokens (JWT)

---

## 2. Current Implementation Details

This section describes the actual, fully integrated backend services, controllers, and APIs currently supporting the platform.

### 2.1 User Authentication & Authorization
* **Secure Registration:** Users sign up for a workspace using structured name, email, password, and an associated `tenantId`. Validation constraints are strictly parsed via a `Zod` schema.
* **Password Hashing:** Passwords are never stored in plain text. The application uses `bcryptjs` with a cost factor of `10` to securely hash credentials before database storage.
* **Stateless JWT Sessions:** Upon successful authentication (Signup/Login), the server signs a stateless JSON Web Token (JWT) using the `JWT_SECRET`.
  * **JWT Payload:** Includes `userId`, `tenantId`, and the user's role (`owner` / `member`).
  * **Expiration:** Configured for `7d` (7 days) for a seamless user experience.
* **Workspace Role Management:** Automatic role resolution is built in. The first user registering for a specific `tenantId` is designated the **owner**, while subsequent users are registered as **members**.
* **Protected Routes:** All private frontend routes and backend controllers are protected by an `auth.middleware.ts` interceptor. It verifies the token in the `Authorization: Bearer <token>` header, decodes it, and attaches the user session directly to `req.user`.

### 2.2 Multi-Tenant Logical Data Isolation
Data isolation is a fundamental, non-negotiable security requirement of this SaaS application.
* **Relational Schema Isolation:** The underlying database schemas map an explicit `tenantId` column to the `User`, `Document`, `Chunk`, and `Conversation` models.
* **Strict Ownership Check:** When a user initiates a conversation or fetches documents, the server enforces verification checks at the controller level to prevent cross-tenant access.
  ```typescript
  // Enforced tenant verification check inside chat.controller.ts
  if (conversation.tenantId !== req.user!.tenantId) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Cross-tenant access is prohibited.",
    });
  }
  ```
* **Database-Level Boundaries:** Every document chunk retrieval query filters records by matching the request's `tenantId` (e.g. `where: { tenantId }`), ensuring zero leakage of proprietary documentation across workspaces.

### 2.3 Document Ingestion & Processing Pipeline
When a user uploads a PDF document inside their workspace, the backend executes a sequential ingestion pipeline:

```
[ PDF File Upload via Multer ] 
              │
              ▼
[ Text Extraction via pdf-parse ] 
              │
              ▼
[ Database Document Metadata Entry ]
              │
              ▼
[ Sliding-Window Chunk Generation (300 words, 50-word overlap) ]
              │
              ▼
[ Vector Embedding Generation per Chunk (gemini-embedding-004) ]
              │
              ▼
[ Neon PostgreSQL Storage of Chunks & Vectors (via Prisma) ]
              │
              ▼
[ Temporary Local File Deletion (fs.unlinkSync) ]
```

1. **Upload Handler:** The request is processed using `Multer` middleware, saving the file temporarily in the local disk directory `./uploads`.
2. **Text Parsing:** The service imports `pdf-parse/lib/pdf-parse.js` to extract raw text buffers.
3. **Chunking Engine:** The extracted text is split into chunks of **300 words** with a **50-word overlap** to preserve semantic continuity at boundaries.
4. **Vector Generation:** The backend invokes the Google Gemini API `gemini-embedding-004` model to generate 768-dimensional floating-point vectors for each individual text chunk.
5. **Prisma Batch Storage:** Chunks are saved to PostgreSQL under the `Chunk` table, linking each record to its parent `documentId` and `tenantId`.
6. **Local Cleanup:** Immediately following database commit, the system deletes the temporary server file using `fs.unlinkSync(req.file.path)` to preserve host storage and guarantee data privacy.

### 2.4 Semantic Retrieval Pipeline
Retrieving highly relevant information is handled entirely in-memory with high-precision scoring:
1. **Query Embedding:** The user's text query is converted to a vector embedding using the same `gemini-embedding-004` model.
2. **Targeted Retrieval:** The backend database fetches all chunks belonging to the current `tenantId` and, optionally, limits the scope to the specific documents selected or associated with the active conversation.
3. **In-Memory Cosine Similarity:** The system executes an in-memory `cosineSimilarity` mathematical calculation:
   $$\text{Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
   This scores each database chunk relative to the user's query vector.
4. **Ranking & Truncation:** Chunks are sorted in descending order of similarity, and the **Top 3 most relevant chunks** are selected to form the contextual prompt.

### 2.5 Security Guardrails & Grounding Pipeline
To ensure high-fidelity interactions, the platform enforces three distinct layers of security and validation:

| Guardrail Phase | Verification Method | Action Taken on Failure |
| :--- | :--- | :--- |
| **1. Prompt Injection Filter** | Regular expression and keyword matching for adversarial keywords (`ignore instructions`, `override prompt`, `system prompt`). | **Rejection:** Blocks request instantly and returns: <br>`"Security Guardrail: Suspicious query behavior detected."` |
| **2. Confidence Relevance Scorer** | Checks if the maximum cosine similarity score is below the threshold of `0.35`. | **LLM Bypass:** Direct response returned to user:<br>`"I'm sorry, but I couldn't find enough reliable information..."` |
| **3. Context-Grounded Prompt** | System instructions forcing the LLM to restrict responses to provided context text. | **LLM Refusal:** Forced response if unanswerable:<br>`"I'm sorry, but this question is out-of-scope..."` |

### 2.6 Conversation Management
* **Timeline Creation:** Users can spin up new conversations in their active workspace, linking them to a list of allowed documents.
* **Message History Storage:** Inbound user queries and outbound assistant responses are stored in the database's `Message` table in chronological order.
* **Chat Persistence:** Users can reload past conversations. The API fetches historic messages and joins them together to rebuild a clean conversation log for the LLM, maintaining conversational context.

---

## 3. Technical Architecture Diagrams

### 3.1 System Architecture Diagram
The system follows a modern three-tier web application architecture with isolated modular services.

```mermaid
graph TD
    subgraph Client Layer
        User[Client Browser]
    end

    subgraph Frontend Tier [Vercel Deployment]
        ReactApp["React App (Vite + Router)"]
        AxiosClient["Axios HTTP Client"]
    end

    subgraph Backend Tier [Render Deployment]
        ExpressServer["Express Node.js Server (TS)"]
        AuthMiddleware["JWT Auth Middleware"]
        MulterService["Multer File Upload"]
        Guardrails["Guardrail Service (Prompt Injection / Confidence Checks)"]
        DocumentService["Document Processing Service (pdf-parse)"]
        EmbeddingService["Embedding Service"]
        RetrievalService["Retrieval & Cosine Similarity Service"]
        AIService["AI Service (Gemini Chat Integration)"]
        PrismaORM["Prisma ORM Client"]
    end

    subgraph Database Tier [Neon Serverless PostgreSQL]
        PGDB[(Neon PostgreSQL Database)]
        TenantTable[Tenant Table]
        UserTable[User Table]
        DocTable[Document Table]
        ChunkTable[Chunk Table with Embeddings]
        ConvTable[Conversation Table]
        MsgTable[Message Table]
    end

    subgraph External Services [SaaS Providers]
        GeminiAPI["Google Gemini API (Free Tier)"]
    end

    User --> ReactApp
    ReactApp --> AxiosClient
    AxiosClient -->|HTTPS Request + JWT| ExpressServer
    ExpressServer --> AuthMiddleware
    ExpressServer --> MulterService
    ExpressServer --> Guardrails
    ExpressServer --> DocumentService
    ExpressServer --> EmbeddingService
    ExpressServer --> RetrievalService
    ExpressServer --> AIService
    ExpressServer --> PrismaORM
    PrismaORM -->|SQL Queries & Mutations| PGDB
    EmbeddingService -->|embedContent| GeminiAPI
    AIService -->|generateContent| GeminiAPI
```

---

### 3.2 System Sequence Diagram
This diagram outlines the sequential web service interactions when uploading documents and asking questions.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / User
    participant FE as React Frontend (Vercel)
    participant BE as Express Backend (Render)
    participant DB as Neon PostgreSQL (Prisma)
    participant Gemini as Google Gemini API

    %% Auth Flow
    rect rgb(240, 248, 255)
        note right of User: Authentication & Onboarding
        User->>FE: Fill Signup / Login Form
        FE->>BE: POST /api/auth/signup or /login
        BE->>DB: Check/Save User & Tenant
        DB-->>BE: User & Tenant Data
        BE-->>FE: Return JSON Web Token (JWT)
        FE->>FE: Store JWT in LocalStorage / App Context
    end

    %% Document Upload Flow
    rect rgb(255, 245, 238)
        note right of User: Document Processing Pipeline
        User->>FE: Upload PDF File
        FE->>BE: POST /api/documents (Multipart File + JWT)
        BE->>BE: Extract text using pdf-parse & generate chunks
        BE->>DB: Save Document Metadata
        loop For Each Chunk
            BE->>Gemini: Generate Embedding (gemini-embedding-004)
            Gemini-->>BE: Return Vector Embedding (Json)
            BE->>DB: Save Chunk (content, index, embedding, tenantId)
        end
        BE->>BE: Delete temporary local file
        BE-->>FE: HTTP 201 (Success response)
        FE->>User: Display processing complete
    end

    %% Chat/Retrieval Flow
    rect rgb(245, 255, 250)
        note right of User: Retrieval & AI Response Generation
        User->>FE: Type message & Ask Question
        FE->>BE: POST /api/chat/:conversationId/ask (Query + JWT)
        BE->>BE: Guardrail 1: Detect Prompt Injection
        BE->>DB: Retrieve past messages (history) & conversation documents
        DB-->>BE: Return Chat History & Document List
        BE->>Gemini: Generate Embedding for Query
        Gemini-->>BE: Return Query Vector
        BE->>DB: Query Chunks for Tenant & Documents
        DB-->>BE: Return Raw Chunks with Embeddings
        BE->>BE: Calculate Cosine Similarity & Sort
        BE->>BE: Guardrail 2: Check Confidence Threshold (> 0.35)
        BE->>BE: Formulate Context & Grounded System Prompt
        BE->>Gemini: Request Chat Completion (gemini-1.5-flash)
        Gemini-->>BE: Return Contextual Response Text
        BE->>DB: Save User Query & Assistant Response in Messages
        BE-->>FE: HTTP 200 (Success response with answer & chunks)
        FE->>User: Render Assistant Answer with references
    end
```

---

### 3.3 Data Flow Diagram (DFD)
This diagram illustrates the transformation and flow of data objects throughout their processing lifecycle.

```mermaid
graph TD
    %% Define Styles
    classDef process fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef store fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef external fill:#f1f8e9,stroke:#7cb342,stroke-width:2px;
    classDef entity fill:#ffe0b2,stroke:#f57c00,stroke-width:2px;

    %% Elements
    UserEnt[User / Client]:::entity
    PdfFile[Raw PDF Upload]:::entity
    UserQuery[User Chat Query]:::entity

    procUpload[1.0 Parse & Extract Text]:::process
    procChunk[2.0 Chunk Text & Tokenize]:::process
    procEmbed[3.0 Generate Vector Embeddings]:::process
    procRetrieve[4.0 Query Embedding & Filter]:::process
    procSimilarity[5.0 In-Memory Cosine Similarity Scorer]:::process
    procGuardrails[6.0 Safety & Grounding Guardrails]:::process
    procGenerate[7.0 Gemini Content Generation]:::process

    dbPG[(Neon PostgreSQL Database)]:::store
    GeminiEmbedding[Gemini Embedding API]:::external
    GeminiFlash[Gemini 1.5 Flash Chat API]:::external

    %% Ingestion Flow
    PdfFile -->|PDF Buffer| procUpload
    procUpload -->|Extracted Text| procChunk
    procChunk -->|Text Chunks| procEmbed
    procEmbed -->|Send Text Chunk| GeminiEmbedding
    GeminiEmbedding -->|Return Vector| procEmbed
    procEmbed -->|Save Chunks & Vectors| dbPG
    procUpload -->|Save Document Metadata| dbPG

    %% RAG Retrieval Flow
    UserQuery -->|Raw text| procGuardrails
    procGuardrails -->|Clean Query| procRetrieve
    procRetrieve -->|Send Query| GeminiEmbedding
    GeminiEmbedding -->|Return Query Vector| procRetrieve
    procRetrieve -->|Fetch Chunks for Tenant/Doc| dbPG
    dbPG -->|Raw Chunks & Vectors| procSimilarity
    procRetrieve -->|Query Vector| procSimilarity
    procSimilarity -->|Sorted Matches| procGuardrails
    procGuardrails -->|Confidence Passed Chunks & History| procGenerate
    procGenerate -->|Formulated Prompt| GeminiFlash
    GeminiFlash -->|Context-Grounded Answer| procGenerate
    procGenerate -->|Save Message History| dbPG
    procGenerate -->|JSON Response| UserEnt
```

---

## 4. Technical Architecture Specifications

Below is a detailed breakdown of core software, middleware, library dependencies, and infrastructure providers chosen for maximum platform reliability.

### Frontend Technology Stack
* **React (v18):** Core UI framework using functional hook-based state architecture.
* **Vite:** High-performance, lightning-fast development build server and asset bundler.
* **React Router Dom:** Enforces single-page-app client-side routing, dashboard hierarchies, and private authenticated route wraps.
* **Axios:** HTTP client featuring global interceptors that automatically attach authentication tokens to request headers.

### Backend Technology Stack
* **Express & Node.js:** Robust server framework utilizing asynchronous route controllers.
* **TypeScript:** Strong static typing across routing parameters, database request shapes, and service definitions.
* **Prisma ORM:** Typesafe database access, structured migration orchestration, and direct schema-to-client translations.
* **JWT Authentication:** Stateless, signed user session authentication utilizing the `jsonwebtoken` package.

### Database & SaaS Infrastructure
* **Neon PostgreSQL:** A serverless cloud SQL database natively capable of massive scaling and instant server-side query routing.
* **Google Gemini API:** AI provider serving embedding pipelines (`gemini-embedding-004`) and context-grounded completions (`gemini-1.5-flash`).
* **Vercel:** Optimized edge hosting for static single-page-apps (SPA) containing direct route redirects.
* **Render:** Cloud hosting platform running the Express Node.js backend.

---

## 5. Gemini API Usage and Limitations

> [!IMPORTANT]
> The platform currently leverages the **Free Tier** of the Google Gemini API. This allows developers to construct high-capacity RAG prototypes at zero operational cost, but brings specific boundaries that must be managed:

* **Rate Limits & Request Quotas:** The free tier imposes hard limits on requests per minute (RPM) and requests per day (RPD).
* **Quota Exhaustion (HTTP 429):** Heavy developer testing, multi-document batch uploads, or high user traffic may occasionally exhaust the available daily request capacity. When this occurs, the Gemini API returns an `HTTP 429 (Too Many Requests)` status code.
* **Graceful Degradation:** Inside `chat.controller.ts`, the application intercepts these `429` status codes and handles them gracefully. An explicit client alert is returned:
  > `"Gemini quota exceeded. Please try again later."`
* **Architecture Integrity:** This limitation is solely external. The local platform architecture, document parsing, user authentication, database connectivity, and workspace structures remain entirely healthy and functional.
* **Enterprise Scaling Pathway:** Upgrading to a paid, pay-as-you-go Gemini API billing structure (Google AI Studio Pay-as-you-go or Google Cloud Vertex AI) removes all free-tier quotas and enables smooth high-throughput scaling.

---

## 6. Deployment Details & Environment Variables

### Hosting Configurations
1. **Frontend Hosting (Vercel):** Deploys the built React app static bundle. Includes rewrite patterns inside `vercel.json` to support clean Client routing.
2. **Backend Hosting (Render):** Hosts the TypeScript Express service under a continuous background runner environment.
3. **Database Hosting (Neon):** Managed serverless cloud PostgreSQL database instance.

### Mandatory Environment Configuration
To run the project in development or production, the following environment variables must be declared in the deployment environments:

```ini
# Backend Environment Configuration (.env)
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
GEMINI_API_KEY="AIzaSy..."
JWT_SECRET="super-secret-cryptographic-hash-key"
FRONTEND_URL="https://multi-tenant-rag.vercel.app"

# Frontend Environment Configuration (.env)
VITE_API_URL="https://multi-tenant-rag.onrender.com"
```

---

## 7. Testing & Verification Matrix

The deployed software has undergone thorough integration testing, ensuring stable database transactions, correct AI interactions, and multi-tenant security guarantees.

| Verified Capability | Status | Validation Log |
| :--- | :---: | :--- |
| **Signup & Login** | **✓ PASS** | Hashed credentials successfully generated, stored, verified, and parsed into a 7d signed JWT payload. |
| **Tenant Creation** | **✓ PASS** | Unique Tenant ID strings properly generated, assigning Owner and Member roles to respective users. |
| **PDF Upload** | **✓ PASS** | Multipart file payload successfully intercepted via Multer, saved to `/uploads`, and processed. |
| **Text Extraction** | **✓ PASS** | `pdf-parse` correctly reads the PDF buffer and returns a complete, uncorrupted UTF-8 text string. |
| **Embedding Generation** | **✓ PASS** | Chunks of 300 words successfully call `gemini-embedding-004` and receive a valid float array embedding vector. |
| **Database Connectivity** | **✓ PASS** | Prisma client successfully establishes a secure SSL handshake with Neon Serverless PostgreSQL to complete schema mutations. |
| **Conversation Inception** | **✓ PASS** | Conversations properly map to multi-document selections, persisting isolated session metadata. |
| **Question Answering** | **✓ PASS** | Successful chunk retrieval, cosine similarity matching, threshold validation (>0.35), prompt grounding, and Gemini completion returned. |
| **Deployment Pipelines** | **✓ PASS** | Continuous Integration builds on Vercel and Render successfully compile and run without runtime exceptions. |

---

## 8. Known Limitations

The project operates under the following constraints, which are fully documented below:
* **Free Gemini API Tier:** Subject to quotas and rate limits, potentially leading to intermittent `HTTP 429 (Too Many Requests)` errors during high-volume document ingestion.
* **Temporary Processing Storage:** Uploaded PDF documents are temporarily saved to Render's local disk workspace during text parsing before being deleted. 
* **Lack of Cloud Blob Storage:** There is currently no persistent Cloud Object Storage bucket (such as AWS S3 or Google Cloud Storage) configured. Documents are stored solely as text chunks inside the PostgreSQL database.
* **Render Free Tier Cold Starts:** Because Render's free tier spins down active instances after 15 minutes of inactivity, the backend may take 50–90 seconds to respond to the initial request of a new session.

---

## 9. Conclusion

The **Multi-Tenant RAG SaaS Platform** successfully demonstrates a complete, secure, cloud-deployed, production-ready solution. It proves that combining React, Express, Prisma, Neon PostgreSQL, and the Google Gemini API yields a powerful document interaction environment. By building hard logical boundaries, custom in-memory cosine similarity search, and rigid security guardrails, the platform delivers high-fidelity AI-powered question answering while strictly guaranteeing workspace data privacy.

---
*Report Compiled: May 29, 2026*
