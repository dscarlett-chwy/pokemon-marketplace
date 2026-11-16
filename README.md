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

Everything is stored in a single SQLite file using Node's built-in `node:sqlite`, so there is no database server to install.

- The file lives at `data/marketplace.db` by default (gitignored). Set `DATABASE_PATH` to put it somewhere else.
- On first start the tables are created and filled with the demo collectors, cards, listings and offers.
- To start over, use **Reset demo data** in the footer, or stop the server and delete the `data` folder.

## Sign-in

Accounts use [Clerk](https://clerk.com). Anyone can browse the marketplace; making offers, adding cards, and the Offers and Dashboard pages need an account. A collector's marketplace profile is created the first time they sign in.

- Locally, Clerk runs on temporary development keys in `.env.local` (gitignored), created by `npx clerk@latest init --accountless`. Run `npx clerk@latest auth login` to claim them into your own Clerk account.
- Development keys accept test emails like `you+clerk_test@example.com` with the code `424242`.
- Ash and Misty are demo sellers with no login. Use two browsers with two accounts to try both sides of a trade.
- **Reset demo data** only shows when signed in, and only in development. Accounts survive a reset; their cards, listings and offers don't.

## Deploy to Railway

The database is a file, so the app needs a host with a persistent disk. Serverless hosts like Vercel lose the file between requests.

1. Sign in at [railway.com](https://railway.com) with GitHub and create a project with **Deploy from GitHub repo**, picking this repo.
2. In the service, open **Settings > Volumes** (or right-click the service and choose **Attach volume**) and mount a volume at `/data`.
3. In **Variables**, add `DATABASE_PATH` = `/data/marketplace.db`, plus `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your Clerk dashboard (use a production instance for a public site, and add the Railway domain to it).
4. In **Settings > Networking**, click **Generate Domain** to get a public URL.

Railway builds with `npm run build`, starts with `npm start`, and picks Node from `engines` in `package.json`. Every push to the main branch redeploys, and the data on the volume carries over.

Keep the app at one replica: SQLite expects a single server writing to the file.

Optional: set `POKEMONTCG_API_KEY` to raise the card catalog's rate limit.
