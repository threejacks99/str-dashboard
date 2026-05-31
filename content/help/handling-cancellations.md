---
title: Handling Cancellations
---

When a guest cancels, you'll want that booking marked as **Cancelled** in Hostics so it drops out of your demand metrics and counts toward your cancellation rate instead. A cancellation gets recorded one of two ways — an automatic prompt during import, and a manual step for everything the prompt can't catch.

It helps to know why this is a step at all: Hostics records every booking you import as **confirmed**. It doesn't read a cancellation status from your CSV or Excel file, since platform exports rarely include one in a consistent place. So cancellations are recorded inside Hostics — either through the conflict prompt below, or by editing the booking yourself.

## The conflict prompt on import

The most common cancellation leaves a fingerprint: the dates get rebooked. A guest cancels their June 1–5 stay, someone else books June 3–7, and now two bookings on the same property claim overlapping dates — which can't both be real.

When an import creates an overlap like this, Hostics shows a **conflict prompt** as soon as the import finishes. It puts the two bookings side by side — guest, dates, source, and amount — and you choose which one to cancel. The booking you pick is marked Cancelled; the other stays confirmed.

A few things to know:

- **Back-to-back stays are fine.** If one booking checks out on the same day the next checks in, that's a normal turnover, not a conflict, and Hostics won't prompt.
- **Owner stays are included.** If a personal or owner block overlaps a guest booking, that's flagged too, so you can release whichever one didn't happen.
- **Skipping is allowed.** If you close the prompt without choosing, nothing is cancelled — and Hostics won't raise that same pair again on a later import. You can still mark it cancelled by hand anytime.

## Marking a booking cancelled yourself

Not every cancellation creates an overlap. If a guest cancels and the dates are never rebooked — or your platform simply drops the cancelled booking from its next export — there's nothing for the prompt to catch. Mark those cancelled by hand:

1. Go to the **Bookings** page.
2. Find the reservation and click the **edit (pencil) icon** on its row.
3. Change **Status** to **Cancelled**.
4. Click **Save Changes**.

This is the same Status field on every reservation, and it's the single source of truth for whether a booking counts as cancelled.

## What changes once a booking is cancelled

A cancelled guest booking drops out of your demand figures — Total Bookings, Total Nights, and the booking charts — and counts toward your **Cancellation Rate** instead. Owner and personal stays are a special case: they're already excluded from those booking metrics and from the cancellation rate, so marking one cancelled keeps your records straight but won't change those numbers. For how each figure is calculated, see [Understanding your booking metrics](/help/understanding-booking-metrics).
