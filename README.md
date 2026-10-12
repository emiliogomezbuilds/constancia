# Constancia

Worker-owned income records with a visible source and no score. Week 9, Business Bending (Team 1, USER).

A worker pastes or uploads a bank statement they already have. Code detects the deposits and computes
monthly figures (lowest month, months covered, average). An optional AI reading (separate consent)
extracts messy rows, and every AI row is checked against the source text before it counts. The worker
can issue a revocable certificate link, see who opened it, and delete everything.

- Packet (written before any code): [`docs/PACKET.md`](docs/PACKET.md)
- Decisions log: [`DECISIONS.md`](DECISIONS.md)

Honest limits: a document the worker uploads is the worker's claim. Constancia labels it that way and
does not verify authenticity. It never scores, grades or labels a person.

## Run locally
```
npm install
cp .env.example .env.local   # fill in the three values
npm run dev
npm run verify               # parser, verification, compute and wording checks
```
