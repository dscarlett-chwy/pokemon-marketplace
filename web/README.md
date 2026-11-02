# Card Circuit

A Next.js marketplace for collector-to-collector Pokémon card trades. Collectors can create accounts, find a card from the TCGdex catalog, publish a listing, send offers, review offers, and exchange contact details after an offer is accepted.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. Local development stores data in `web/data/marketplace.db`.

## Deploy

Deploy on a Node.js host with a shared libSQL/Turso database. Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in the host's environment, then run `npm run build` and `npm start`. The app creates its tables on first request. Do not use a local file database on ephemeral serverless hosting.

No payment, shipping, or card verification service is integrated. After a trade is accepted, the two collectors receive each other's email addresses and arrange the exchange themselves. Catalog images are reference art; sellers must describe the condition of their physical card.

Card metadata and images are supplied by [TCGdex](https://tcgdex.dev). Card Circuit is not affiliated with Pokémon, Nintendo, Creatures, or Game Freak.
