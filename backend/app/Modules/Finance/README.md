# Finance module

Owns financial accounts, categories, payees, income and expense transactions, transfers, tags, recurring patterns, and import provenance.

## Initial ledger model

- Accounts store their own ISO-style currency and opening balance. Current balances are derived from that opening balance, income/expense transactions, and transfer legs using database decimal expressions; the API returns four-place decimal strings.
- A transaction is exactly one income or expense in the account's currency. Its category, payee, and tags are normalized relations.
- Categories are owner-scoped and are renamed or recolored rather than deleted. Transaction foreign keys restrict hard deletion, so historical entries keep their category association.
- A transfer is one paired record with source and destination account IDs, per-side amounts, and currency snapshots. Same-currency pairs must balance; cross-currency pairs require an explicit destination amount. Transfers are not income/expense transactions, so cash-flow totals can include only the transaction table without counting a transfer twice.
- Payees and tags are owner-scoped reusable records. Recurring patterns describe expected transactions but do not create ledger entries by themselves.
- Imported source IDs and raw provider metadata live in `finance_import_references`, separate from normalized transaction fields.

Every API query is scoped to the authenticated owner. The initial API exposes account, category, transaction, and transfer create/list operations; category edits preserve transaction links.
