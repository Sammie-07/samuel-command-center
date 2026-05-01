# Samuel's Ledger

Financial tracking dashboard for Samuel's 2026–2027 savings plan.

## Setup

```bash
cd dashboard
npm install
npm run dev
```

## Features

- **Overview** — On-track status, fund balances (actual vs planned), income breakdown, upcoming purchases
- **Timeline** — All 43 biweekly periods across 2026–2027; mark each payment as received
- **Budget** — Monthly expense breakdown with visual, biweekly cash flow, allocation split
- **Purchases** — Milestone checklist: Power Tank → MacBook → Passport → Phone → Rent → Car

## How to use

1. Every payday, open the app and tap **"I Received My Payment"** on the Overview tab
2. Confirm the amount (defaults to ₦650,000) — it shows your tithe, upkeep and net save split
3. Update your actual fund balances via **"Update actuals"** on the Fund Balances card
4. When you make a purchase, go to **Purchases** and mark it done with the actual cost paid

All data is saved in your browser's localStorage — nothing leaves your device.
