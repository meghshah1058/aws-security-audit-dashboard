# CLAUDE.md - Project Guide for Claude Code

## Project Overview

Multi-cloud security audit dashboard for AWS, GCP, and Azure. Built with Next.js 16, TypeScript, Prisma, and Tailwind CSS.

## Quick Commands

```bash
# Development
npm run dev              # Start dev server (default port 3000)
PORT=5000 npm run dev    # Start on custom port

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio

# Build
npm run build            # Production build
npm run start            # Start production server

# Docker
docker-compose up -d     # Start with Docker
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Auth pages (login, register)
│   ├── (dashboard)/            # Dashboard pages
│   │   └── dashboard/
│   │       ├── page.tsx        # AWS Dashboard
│   │       ├── accounts/       # AWS Accounts management
│   │       ├── findings/       # AWS Findings
│   │       ├── gcp/            # GCP Dashboard, Projects, Findings
│   │       ├── azure/          # Azure Dashboard, Subscriptions, Findings
│   │       ├── settings/       # User settings
│   │       └── reports/        # Reports page
│   ├── api/                    # API routes
│   │   ├── accounts/           # AWS accounts CRUD
│   │   ├── gcp/                # GCP projects & findings
│   │   ├── azure/              # Azure subscriptions & findings
│   │   ├── dashboard/          # Dashboard data
│   │   └── auth/               # NextAuth endpoints
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # Shadcn UI components
│   ├── dashboard/              # Dashboard components
│   ├── charts/                 # Chart components (Recharts)
│   └── landing/                # Landing page components
├── lib/
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Prisma client
│   └── utils.ts                # Utility functions
└── types/                      # TypeScript types
```

## Key Technologies

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Charts**: Recharts
- **AI**: Claude API integration

## Database Schema

Three cloud providers with similar structure:
- **AWS**: `AwsAccount` → `AwsAudit` → `AwsPhase` / `AwsFinding`
- **GCP**: `GcpProject` → `GcpAudit` → `GcpPhase` / `GcpFinding`
- **Azure**: `AzureSubscription` → `AzureAudit` → `AzurePhase` / `AzureFinding`

## Environment Variables

Required in `.env`:
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."  # For AI assistant
```

## Coding Conventions

- Use TypeScript strict mode
- Components in PascalCase
- API routes return `NextResponse.json()`
- Use `getServerSession(authOptions)` for auth in API routes
- Prisma queries use the singleton from `@/lib/db`
- Glass-card styling for dashboard cards
- Color scheme: Purple primary, Orange (AWS), Blue (GCP), Cyan (Azure)

## Cloud Provider Colors

- **AWS**: `orange-400`, `bg-orange-500/10`
- **GCP**: `blue-400`, `bg-blue-500/10`
- **Azure**: `cyan-400`, `bg-cyan-500/10`

## Security Audit Phases

Each cloud provider has 25 audit phases covering:
1. IAM & Identity
2. Storage Security
3. Compute Security
4. Network Security
5. Database Security
6. Encryption & KMS
7. Logging & Monitoring
8. And 18 more...

## API Patterns

```typescript
// GET with auth
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of logic
}
```

## Notes

- Landing page uses smooth scroll for anchor links
- Sidebar is collapsible with cloud provider sections
- All dashboard pages support loading skeletons
- Forms use toast notifications (sonner)
