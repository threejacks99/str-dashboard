---
title: Importing Data
---

Hostics's importer reads CSV and Excel (.xlsx) exports from most short-term rental platforms, plus your own spreadsheets. It recognizes the columns automatically — you don't need to rename anything to match a fixed template — and it sorts each file into reservations or expenses based on the columns it contains.

A few things that apply to every import:

- **CSV and Excel both work.** If your platform exports `.xlsx`, upload it as-is; there's no need to convert to CSV first.
- **Dates are flexible.** `2024-12-21`, `12/21/2024`, `21/12/2024`, and `Dec 21, 2024` all parse correctly.
- **Amounts can include `$` and commas.** `$1,250.00` reads the same as `1250`.
- **Re-importing is safe.** Hostics de-duplicates, so uploading an updated file won't create double entries. (One exception worth knowing about for expenses — see [Common issues](/help/common-issues).)

Pick your source for step-by-step instructions:

- [Importing from Airbnb](/help/importing-airbnb)
- [Importing from VRBO](/help/importing-vrbo)
- [Importing from Hostaway](/help/importing-hostaway)
- [Setting up your expense tracking](/help/importing-expenses)
- [Importing multiple properties at once](/help/multi-property-import)
