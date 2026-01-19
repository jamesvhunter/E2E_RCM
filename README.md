# ClaimFlow: AI-Native EHR & Practice Management System

An AI-native Electronic Health Record (EHR) and Practice Management system focused on revenue cycle management (RCM) and insurance billing. Built for high-fidelity prototyping of end-to-end claim generation workflows.

## 🎯 Project Scope

### What We're Building
- **Billing-grade patient intake** with insurance coverage capture
- **AI-powered charge capture** from clinical encounters
- **Automated claim generation** (837P professional claims)
- **EDI transaction processing** via Stedi (eligibility, claims, remittances)
- **Double-entry ledger** for accurate patient accounting
- **Work queues** for human-in-the-loop exception handling

### V1 Constraints (Intentionally Limited)
| In Scope | Out of Scope |
|----------|--------------|
| 837P (Professional/CMS-1500) | 837I (Institutional), 837D (Dental) |
| Single practice, single specialty | Multi-tenancy |
| 1-2 commercial payers + self-pay | Secondary claims, COB |
| Primary insurance only | Prior authorization |
| Admin user role | Multiple user roles |
| Outpatient visits | Complex facility billing |

### Supported EDI Transactions (via Stedi)
- **270/271** - Eligibility inquiry/response
- **837P** - Professional claim submission
- **277CA** - Claim acknowledgment
- **835** - Electronic remittance advice (ERA)
- **276/277** - Claim status inquiry/response

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │Patient Intake│ │Charge Review │ │ Claims Queue │ │   Operations Console ││
│  │  + Coverage  │ │   (AI-HitL)  │ │  + Status    │ │   (Work Queues)      ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │  tRPC Router  │
                              └───────┬───────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────────┐
│                           API LAYER (Next.js)                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         Domain Services                                 │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │  │
│  │  │  Patient &  │ │  Encounter  │ │   Claims    │ │    Ledger       │   │  │
│  │  │  Coverage   │ │  & Charges  │ │   Service   │ │    Service      │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │  │
│  │  │ Eligibility │ │  Remittance │ │ Collections │ │   Work Queue    │   │  │
│  │  │   Service   │ │   Service   │ │   Service   │ │    Service      │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                        │
│  ┌───────────────────────────────────┼───────────────────────────────────┐   │
│  │              AI Layer (OpenAI + Vercel AI SDK)                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐ │   │
│  │  │  Coding Co-Pilot│  │ Denial Classifier│  │ Uncertainty Gating     │ │   │
│  │  │  (CPT/ICD-10)   │  │  (CARC → Action) │  │ (Route to Human Queue) │ │   │
│  │  └─────────────────┘  └─────────────────┘  └────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬─────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────────┐
│                         BACKGROUND JOBS (Inngest)                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐  │
│  │ Claim Lifecycle │ │ Webhook Handler │ │    ERA Auto-Posting             │  │
│  │  State Machine  │ │ (Stedi Events)  │ │    (835 → Ledger)               │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘  │
└─────────────────────────────────────┬─────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────────┐
│                          SUPABASE (PostgreSQL)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Schemas / Tables                                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │ │
│  │  │ patients │ │encounters│ │  claims  │ │  ledger  │ │  operations  │   │ │
│  │  │ coverage │ │ charges  │ │  remits  │ │ entries  │ │  work_items  │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │ │
│  │  ┌──────────┐ ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ practice │ │               audit_log (append-only)                │  │ │
│  │  │ providers│ │                                                      │  │ │
│  │  └──────────┘ └──────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │      STEDI      │  │     STRIPE      │  │  RESEND/TWILIO  │               │
│  │  270/271/837P   │  │    Payments     │  │  Notifications  │               │
│  │  277CA/835/276  │  │    Refunds      │  │   Statements    │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15+** (App Router) | React framework with server components |
| **TypeScript** | Type safety for billing data integrity |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible, customizable component library |
| **TanStack Query** | Server state management |
| **Zustand** | Minimal client state |
| **React Hook Form + Zod** | Form handling with validation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | API endpoints |
| **tRPC** | End-to-end type-safe API |
| **Supabase** | PostgreSQL database + auth + realtime |
| **Inngest** | Durable background workflows |
| **Zod** | Runtime validation |

### AI Layer
| Technology | Purpose |
|------------|---------|
| **OpenAI API (GPT-4o)** | Coding co-pilot, denial classification |
| **Vercel AI SDK** | Streaming, structured outputs |
| **pgvector** | Code set embeddings (future) |

### External Services
| Service | Purpose |
|---------|---------|
| **Stedi** | EDI clearinghouse (eligibility, claims, remits) |
| **Stripe** | Patient payments |
| **Resend** | Transactional email |
| **NPPES API** | NPI validation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Vercel** | Frontend + API hosting |
| **Supabase** | Managed PostgreSQL + Auth |

---

## 📁 Project Structure

```
E2E_RCM/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth routes (login, etc.)
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── patients/         # Patient management
│   │   │   ├── encounters/       # Encounter & charge capture
│   │   │   ├── claims/           # Claims queue & status
│   │   │   ├── ledger/           # Patient accounting
│   │   │   └── operations/       # Work queues
│   │   ├── api/                  # API routes
│   │   │   ├── trpc/             # tRPC handler
│   │   │   └── webhooks/         # Stedi webhooks
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── forms/                # Form components
│   │   ├── tables/               # Data tables
│   │   └── layouts/              # Layout components
│   │
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/             # Supabase client & types
│   │   ├── trpc/                 # tRPC setup
│   │   ├── stedi/                # Stedi API client
│   │   ├── ai/                   # OpenAI utilities
│   │   └── utils.ts              # General utilities
│   │
│   ├── server/                   # Server-side code
│   │   ├── routers/              # tRPC routers
│   │   │   ├── patient.ts
│   │   │   ├── coverage.ts
│   │   │   ├── encounter.ts
│   │   │   ├── claim.ts
│   │   │   ├── ledger.ts
│   │   │   └── eligibility.ts
│   │   ├── services/             # Domain services
│   │   └── db/                   # Database queries
│   │
│   ├── types/                    # TypeScript types
│   │   ├── database.ts           # Supabase generated types
│   │   ├── stedi.ts              # Stedi API types
│   │   └── domain.ts             # Domain types
│   │
│   └── inngest/                  # Background jobs
│       ├── client.ts
│       └── functions/
│           ├── claim-lifecycle.ts
│           └── era-processing.ts
│
├── supabase/
│   ├── migrations/               # Database migrations
│   └── seed.sql                  # Seed data
│
├── public/                       # Static assets
├── .env.example                  # Environment template
├── .env.local                    # Local environment (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json               # shadcn/ui config
└── README.md
```

---

## 🗄️ Database Schema

### Core Enums (State Machines)

```sql
-- Coverage verification state
CREATE TYPE coverage_status AS ENUM (
  'incomplete',           -- Missing required fields
  'pending_verification', -- Awaiting eligibility check
  'verified',             -- Eligibility confirmed
  'inactive'              -- Coverage terminated
);

-- Charge set lifecycle
CREATE TYPE charge_set_status AS ENUM (
  'draft',        -- Being captured
  'coder_review', -- AI flagged for human review
  'finalized',    -- Ready for claim
  'void'          -- Cancelled
);

-- Claim lifecycle
CREATE TYPE claim_status AS ENUM (
  'ready',        -- Assembled, not submitted
  'submitted',    -- Sent to payer via Stedi
  'ack_accepted', -- 277CA accepted
  'ack_rejected', -- 277CA rejected
  'adjudicated',  -- 835 received
  'closed'        -- Fully reconciled
);

-- Stedi enrollment lifecycle
CREATE TYPE enrollment_status AS ENUM (
  'draft',
  'stedi_action_required',
  'provider_action_required',
  'provisioning',
  'live',
  'rejected',
  'canceled'
);

-- Ledger entry types (double-entry inspired)
CREATE TYPE ledger_entry_type AS ENUM (
  'charge',           -- Service rendered
  'patient_payment',  -- Patient paid
  'insurance_payment',-- Payer paid
  'adjustment',       -- Contractual adjustment
  'refund',           -- Money returned
  'writeoff'          -- Bad debt
);

-- Work item types
CREATE TYPE work_item_type AS ENUM (
  'coverage_incomplete',
  'eligibility_failed',
  'charge_review',
  'claim_rejected',
  'remit_unmatched',
  'denial_review'
);
```

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    PATIENTS     │       │   GUARANTORS    │       │   SUBSCRIBERS   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │   ┌───│ id              │
│ first_name      │   │   │ patient_id      │───┤   │ coverage_id     │
│ last_name       │   │   │ relationship    │   │   │ member_id       │
│ dob             │   │   │ first_name      │   │   │ group_number    │
│ sex             │   │   │ last_name       │   │   │ subscriber_name │
│ address         │   │   │ address         │   │   │ subscriber_dob  │
│ phone           │   │   │ phone           │   │   │ relationship    │
│ email           │   │   └─────────────────┘   │   └─────────────────┘
└─────────────────┘   │                         │
        │             │   ┌─────────────────────┘
        │             │   │
        ▼             │   ▼
┌─────────────────┐   │   ┌─────────────────┐       ┌─────────────────┐
│COVERAGE_POLICIES│───┘   │     PAYERS      │       │   ELIGIBILITY   │
├─────────────────┤       ├─────────────────┤       │    _CHECKS      │
│ id              │───────│ id              │       ├─────────────────┤
│ patient_id      │       │ stedi_payer_id  │◄──────│ id              │
│ payer_id        │       │ name            │       │ coverage_id     │
│ plan_type       │       │ type            │       │ provider_id     │
│ priority        │       └─────────────────┘       │ date_of_service │
│ effective_from  │                                 │ request_payload │
│ effective_to    │                                 │ response_payload│
│ status          │                                 │ is_active       │
└─────────────────┘                                 │ benefits_summary│
        │                                           └─────────────────┘
        │
        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   ENCOUNTERS    │       │   CHARGE_SETS   │       │  SERVICE_LINES  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │──────▶│ id              │──────▶│ id              │
│ patient_id      │       │ encounter_id    │       │ charge_set_id   │
│ coverage_id     │       │ version         │       │ line_number     │
│ provider_id     │       │ status          │       │ cpt_code        │
│ location_id     │       │ ai_confidence   │       │ modifiers       │
│ start_time      │       │ reviewed_by     │       │ dx_codes        │
│ end_time        │       │ reviewed_at     │       │ units           │
│ place_of_service│       └─────────────────┘       │ charge_amount   │
│ chief_complaint │                                 │ dos_from        │
└─────────────────┘                                 │ dos_to          │
        │                                           │ provider_ctrl_no│
        │                                           └─────────────────┘
        │                                                   │
        ▼                                                   ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     CLAIMS      │       │ CLAIM_RESPONSES │       │ LEDGER_ENTRIES  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │──────▶│ id              │       │ id              │
│ encounter_id    │       │ claim_id        │       │ patient_id      │
│ charge_set_id   │       │ type (277/835)  │       │ encounter_id    │
│ patient_ctrl_no │       │ stedi_txn_id    │       │ service_line_id │
│ claim_version   │       │ raw_payload     │       │ claim_id        │
│ status          │       │ parsed_data     │       │ entry_type      │
│ stedi_txn_id    │       │ processed_at    │       │ amount          │
│ submitted_at    │       └─────────────────┘       │ carc_code       │
└─────────────────┘                                 │ rarc_code       │
                                                    │ created_at      │
                                                    └─────────────────┘
```

---

## 📋 Implementation Phases

### Phase 0: Foundation ✅
- [x] Project documentation
- [x] Next.js 15 setup with App Router
- [x] Tailwind + shadcn/ui configuration
- [x] Supabase client setup
- [x] tRPC configuration
- [x] Base database schema
- [x] Environment configuration

### Phase 1: Patient Intake + Eligibility ✅
- [x] HIPAA-safe patient intake via tokenized SMS links (Twilio)
- [x] Multi-step intake form (demographics, insurance, consent)
- [x] Bot protection with Cloudflare Turnstile
- [x] Patient demographics form
- [x] Subscriber capture (when patient is not policyholder)
- [x] Coverage policy management
- [x] Payer search/picker combobox
- [x] Real-time eligibility check (Stedi 270/271)
- [x] Benefits summary display after intake
- [ ] Guarantor management
- [ ] Coverage incomplete work items

### Phase 2: Charge Capture
- [ ] Encounter creation
- [ ] AI-powered code suggestion (CPT/ICD-10)
- [ ] Uncertainty gating (route to human review)
- [ ] Charge review UI
- [ ] ChargeSet finalization workflow
- [ ] Service line validation

### Phase 3: Practice Master Data
- [ ] Organization setup
- [ ] Provider management (NPI validation)
- [ ] Location/facility configuration
- [ ] Stedi enrollment orchestration
- [ ] Enrollment status dashboard

### Foundation-Cash: Ledger + Payments
- [ ] Ledger schema implementation
- [ ] Balance computation views
- [ ] Stripe integration for copays
- [ ] Payment posting
- [ ] Patient account view

### Phase 4: Claim Submission
- [ ] 837P claim assembly
- [ ] Pre-submission validation
- [ ] Stedi claim submission
- [ ] Claim tracking dashboard
- [ ] Resubmission workflow

### Phase 5: Response Reconciliation
- [ ] Stedi webhook handling (idempotent)
- [ ] 277CA ingestion + claim status update
- [ ] 835 ERA parsing
- [ ] Auto-posting to ledger
- [ ] Exception work queues

### Phase 6: Collections
- [ ] Patient statement generation
- [ ] Dunning workflow
- [ ] Denial classification
- [ ] Appeals/resubmission workflow

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Stedi account with API credentials
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd E2E_RCM

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start Supabase locally (optional)
npx supabase start

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STEDI_API_KEY` | Stedi Healthcare API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164 format) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `INNGEST_EVENT_KEY` | Inngest event key |
| `INNGEST_SIGNING_KEY` | Inngest signing key |
| `NEXT_PUBLIC_APP_URL` | Public URL for intake links |

---

## 🔑 Key Engineering Decisions

### 1. Idempotent Webhook Processing
Stedi webhooks may retry up to 5 times. We enforce idempotency via unique constraints:

```typescript
// Insert with ON CONFLICT DO NOTHING
const { error } = await supabase
  .from('processed_stedi_events')
  .insert({ transaction_id: event.transactionId })
  .single();

if (error?.code === '23505') return; // Already processed
```

### 2. Event-Sourced Ledger
Balances are never stored directly—always computed from entries:

```sql
CREATE VIEW patient_balances AS
SELECT 
  patient_id,
  SUM(CASE WHEN entry_type = 'charge' THEN amount ELSE 0 END) as charges,
  SUM(CASE WHEN entry_type IN ('insurance_payment', 'adjustment') THEN amount ELSE 0 END) as insurance_applied,
  SUM(CASE WHEN entry_type = 'patient_payment' THEN amount ELSE 0 END) as patient_paid,
  -- Derived
  charges - insurance_applied - patient_paid as patient_balance
FROM ledger_entries
GROUP BY patient_id;
```

### 3. Versioned Claims (Never Overwrite)
Claims and charge sets are versioned. Corrections create new versions:

```typescript
// Resubmit creates new version
const newClaim = await createClaim({
  ...originalClaim,
  claim_version: originalClaim.claim_version + 1,
  parent_claim_id: originalClaim.id
});
```

### 4. Claim Correlation
We use `patientControlNumber` (claim-level) and `providerControlNumber` (service-line-level) for correlating payer responses:

```typescript
const claim837P = {
  claimInformation: {
    patientControlNumber: claim.id, // Our internal ID
    serviceLines: serviceLines.map(line => ({
      providerControlNumber: line.id, // For 835 line-level matching
      // ...
    }))
  }
};
```

---

## 📚 Key Resources

- [Stedi Healthcare API Docs](https://www.stedi.com/docs/healthcare)
- [X12 837P Guide](https://www.stedi.com/edi/x12/transaction-set/837)
- [CARC/RARC Codes](https://www.cms.gov/Medicare/Remittance-and-Billing)
- [NPPES NPI Registry](https://npiregistry.cms.hhs.gov/api-page)

---

## 📄 License

Proprietary - All Rights Reserved
