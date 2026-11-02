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

There is no sign-in yet: the "Viewing as" switcher picks which collector you act as, and anyone with the link can act as either one.

## Deploy to Railway

The database is a file, so the app needs a host with a persistent disk. Serverless hosts like Vercel lose the file between requests.

1. Sign in at [railway.com](https://railway.com) with GitHub and create a project with **Deploy from GitHub repo**, picking this repo.
2. In the service, open **Settings > Volumes** (or right-click the service and choose **Attach volume**) and mount a volume at `/data`.
3. In **Variables**, add `DATABASE_PATH` = `/data/marketplace.db`.
4. In **Settings > Networking**, click **Generate Domain** to get a public URL.

Railway builds with `npm run build`, starts with `npm start`, and picks Node from `engines` in `package.json`. Every push to the main branch redeploys, and the data on the volume carries over.

Keep the app at one replica: SQLite expects a single server writing to the file.

Optional: set `POKEMONTCG_API_KEY` to raise the card catalog's rate limit.
