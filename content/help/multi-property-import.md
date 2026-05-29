---
title: "Importing Multiple Properties at Once"
category: "Importing Data"
---

If you manage more than one rental and your export covers all of them in a single file (common with channel managers like Hostaway, and with PM portals), Hostics can split the rows out to the right properties in one upload — as long as the file tells it which row belongs where.

## The recommended file shape

Include a **Property** column whose values exactly match your Hostics property names. Hostics also accepts these header labels for that column: `Property Name`, `Listing`, `Listing Name`, `Unit`, `Unit Name`, `House`, or `House Name`.

> **Matching is exact (but not case-sensitive).** "Beach House" matches "beach house", but "Beach House #2" will **not** match a property named "Beach House 2". Leading and trailing spaces are ignored; everything else must line up. This strictness is deliberate — silently filing income or expenses under the wrong property is the one mistake that quietly corrupts your numbers, so Hostics never guesses.

If your file doesn't have a Property column, or you'd rather not deal with name-matching, the simplest path is to **import one property at a time**: select the property at upload, and upload a file that contains only that property's rows.

## How the upload works

1. Make sure your account has more than one property and your file includes a Property column with values.
2. Open **Add Data** and upload the file. Hostics detects the multiple properties automatically.
3. For any property name it recognizes, rows are matched and ready to import.
4. For any name it **doesn't** recognize, you'll get a short mapping step: for each unknown name, either map it to an existing property from a dropdown, or choose **Create new** to add it as a new property on the spot.
5. Once every name is resolved, confirm the import. De-duplication runs per property, so re-uploading the same multi-property file later won't double up any property's data.

## Edge cases worth knowing

- **Creating new properties from the file counts against your plan's property limit.** If you're on Solo (1 property) or Portfolio (10 included), creating beyond your cap follows the normal limit and overage rules. If a bulk create hits your cap partway through, the properties created before the limit was reached stay — the cleanest recovery is to **re-upload the same file** after sorting out your plan; the rows for already-created properties will match automatically on the next pass. (Re-mapping within the same upload won't pick them up — the dropdown only refreshes on a fresh upload.)
- **Upgrading later honors a Property column that was previously ignored.** If you were on Solo and Hostics ignored your file's Property column (because you only had one property), upgrading to Portfolio and adding a second property means future uploads start honoring that column. Rows you imported *before* the upgrade stay attributed to whichever property was selected at the time — they don't retroactively re-sort.

See [Setting up multiple properties](/help/multi-property-setup) for getting your portfolio organized in the first place.
