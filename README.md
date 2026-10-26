# TradingCrew

**Snap · Share · Swap**

TradingCrew is a web app where kids upload photos of their trading cards (sports, Pokémon, etc.), show them in galleries their friends can see, and propose trades they complete in person.

## Tech Stack

- [Next.js 16](https://nextjs.org) with App Router
- TypeScript
- Tailwind CSS
- [Auth.js](https://authjs.dev) (next-auth v5) with Google OAuth
- [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL (Neon)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for image storage
- Deployed on [Vercel](https://vercel.com)

## Features

- **User Authentication**: Sign in with Google OAuth
- **Card Gallery**: Upload and manage your trading card collection
- **Public Profiles**: Share your collection with others via `/u/[id]`
- **Image Upload**: Upload card photos (JPEG, PNG, GIF, WebP, max 10MB)
- **Categories**: Organize cards by Sports, Pokémon, or Other

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `AUTH_SECRET` | Secret for Auth.js session encryption. Generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `AI_GATEWAY_API_KEY` | Optional locally. Vercel deployments use OIDC instead. Enable AI Gateway on the project. |
| `AI_GATEWAY_MODEL` | Optional vision model override. Default is `google/gemini-2.5-flash-lite`. |

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local development)
7. Copy the Client ID and Client Secret to your environment variables

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Setup

1. Create a PostgreSQL database (we recommend [Neon](https://neon.tech))
2. Set the `DATABASE_URL` environment variable
3. Run migrations:

```bash
npm run db:push    # Push schema to database (development)
# or
npm run db:migrate # Run migrations (production)
```

**Note:** Migrations run automatically during `npm run build` if `DATABASE_URL` is set. This means tables are created automatically during Vercel deployments.

## Development

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run db:generate # Generate migrations from schema changes
npm run db:push     # Push schema to database
npm run db:migrate  # Run migrations
npm run db:studio   # Open Drizzle Studio (database GUI)
```

## Graceful Degradation

The app is designed to work even when environment variables are not configured:
- The landing page always renders
- Protected pages show a "Service Unavailable" message when the database is not configured
- Auth endpoints return 503 when not configured

## Deployment

This project is automatically deployed to Vercel when changes are pushed to the main branch.

- Production: [tradingcrew.ai](https://tradingcrew.ai)

### Vercel Environment Variables

Set the following environment variables in your Vercel project settings:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `BLOB_READ_WRITE_TOKEN` (automatically set if using Vercel Blob via the dashboard)

Card names from the batch camera are read through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Enable AI Gateway for the project (a payment method is required for credits). Production uses the deployment's OIDC token, so you do not add a provider key. Set `AI_GATEWAY_API_KEY` only for local runs that are not using `vercel env pull`. `AI_GATEWAY_MODEL` is optional.
