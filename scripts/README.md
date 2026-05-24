# Market data ingestion

## `generate-investment-registry`

Refreshes Nepal registry TypeScript from:

1. **`sharealpha-stock.md`** — markdown export of Share Alpha’s stock directory (symbols, sector, company name, last close).
2. **`cdsc-mf.html`** — saved HTML from [CDSC registered mutual funds](https://cdsc.com.np/mutualfunds) (authoritative open/closed MF list).

```bash
curl -sL 'https://cdsc.com.np/mutualfunds' -o scripts/cdsc-mf.html
npm run generate:investment-registry
```

Outputs:

- `src/lib/investment-market/data/nepse/generated-equities.ts`
- `src/lib/investment-market/data/mutual-funds-cdsc.generated.ts`

Open-ended funds are generated with `sipSupported: true` for every scheme because CDSC does not publish SIP flags; confirm with the RTA if you need exact per-fund SIP availability.

Commit the updated `.ts` files when you refresh listings.
