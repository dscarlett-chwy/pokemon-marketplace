# Trade Binder

A Pokemon card marketplace where collectors list cards, make offers in cash or cards, and counter until they agree.

## Run it locally

Needs Node 24 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

Everything is stored in [Supabase](https://supabase.com) Postgres, added to the Vercel project through the Supabase integration.

- The app connects with `POSTGRES_URL`, which the integration sets on Vercel. `DATABASE_URL` works too, for any other Postgres.
- Locally, link the project and pull its variables into a file of their own, so `.env.local` and its Clerk keys stay as they are:

  ```bash
  vercel link
  vercel env pull .env.development.local
  ```

- On first start the tables are created empty. Everything in them comes from real collectors: their accounts, the cards they add, and their listings and offers. Card details and prices come from the Pokemon TCG API when a card is added.
- The pulled variables point at the same database as the live site, so anything done locally shows up there too.
- Row level security is on with no policies, so Supabase's public Data API can't reach the tables; the app connects as their owner.

## Sign-in

Accounts use [Clerk](https://clerk.com). Anyone can browse the marketplace; making offers, adding cards, and the Offers and Dashboard pages need an account. A collector's marketplace profile is created the first time they sign in.

- Locally, Clerk runs on temporary development keys in `.env.local` (gitignored), created by `npx clerk@latest init --accountless`. Run `npx clerk@latest auth login` to claim them into your own Clerk account.
- Development keys accept test emails like `you+clerk_test@example.com` with the code `424242`.
- Use two browsers with two accounts to try both sides of a trade.

## Deploy to Vercel

1. Import this repo as a Vercel project.
2. In the project's **Storage** tab, add **Supabase** and connect it to the project. That sets `POSTGRES_URL` and the other Supabase variables.
3. In **Settings > Environment Variables**, add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your Clerk dashboard (use a production instance for a public site, and add the Vercel domain to it).
4. Redeploy. Every push to the main branch deploys again.

`POSTGRES_URL` goes through Supabase's transaction pooler, which suits serverless functions; the app turns off prepared statements for it.

Optional: set `POKEMONTCG_API_KEY` to raise the card catalog's rate limit.
