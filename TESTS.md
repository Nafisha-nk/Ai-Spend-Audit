# Tests

Run all tests:

```bash
npm test
```

## Automated Tests

- `src/lib/audit.test.ts` - downgrades Cursor Business for a two-person team.
- `src/lib/audit.test.ts` - applies discounted credits for high OpenAI API spend.
- `src/lib/audit.test.ts` - returns honest zero-savings output for efficient Copilot individual spend.
- `src/lib/audit.test.ts` - calculates annual savings from monthly savings.
- `src/lib/audit.test.ts` - flags duplicated Cursor and GitHub Copilot coding spend.
- `src/lib/audit.test.ts` - marks very large Anthropic API savings as Credex eligible.

The tests focus on the audit engine because it is the core correctness risk in this product.
