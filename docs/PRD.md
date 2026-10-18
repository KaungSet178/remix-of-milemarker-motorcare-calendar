# Vehicle Maintenance Tracker — PRD v1.0 implementation notes

Source: *Vehicle Maintenance Tracker PRD v1.0 (MVP scope, October 2026)* plus the hand-drawn screen sketch. This file records how the app maps to that PRD.

## Screens

| Path | Screen | Sketch / PRD |
|---|---|---|
| `/` | My Vehicles: first-vehicle form, vehicle cards with per-item status, collapsible **Service intervals**, in-app reminder banners, archived vehicles | Sketch screens 1–2, Journey A |
| `/vehicle/$id` | Vehicle detail: odometer update, item cards with **+ Record**, add item, history filtered by item, edit / archive / delete menu | Sketch screen 3, Journey B |
| Record dialog | Date, current mileage, type/product, cost, provider, notes, **Save record / Cancel** | Sketch screen 4, FR-03 |
| `/dashboard` | Overdue / Due soon / Up to date / Needs information, recently completed; **Log service** and **Adjust schedule** on each item | FR-05, Journey C |
| `/calendar` | Monthly view of past services and upcoming due dates | Original brief |
| `/history` | All records, filtered by vehicle and maintenance type, total cost, CSV export | FR-06, FR-09 |
| `/settings` | Due-soon lead time (days and km), in-app reminders on/off, currency, CSV export, disclaimer | FR-08 |

Navigation: Vehicles · Dashboard · Calendar · History · Settings.

## Data (localStorage key `carcare-v2`; `carcare-v1` data is migrated automatically)

- **Vehicle**: type, make, model (required); year, nickname, plate, odometer, notes (optional); archived.
- **MaintenanceItem**: type (oil, tire, brakes, battery, fluids, inspection, custom), title, `intervalMonths` and/or `intervalKm`. New vehicles start with Engine oil and Tires.
- **ServiceRecord**: item, date (required, not in the future), odometer (≥ 0, optional), product, cost, provider, notes. Records are appended and never silently replaced. Exact duplicates (same item, date and odometer) are rejected. A higher odometer raises the vehicle's odometer.
- **Settings**: `leadDays` (30), `leadKm` (1000), `inAppReminders`, `currency`.

## Due logic (`computeDue` in `src/lib/store.ts`)

- Next due date = last service date + interval months. Next due odometer = last service odometer + interval km.
- An item is overdue or due soon as soon as **either** threshold is reached. The status names its trigger: date, mileage, or both.
- With no current odometer, mileage status is not inferred. The item shows "Needs mileage" or "Mileage status needs an odometer update".
- Status pills always pair an icon with text, so color is never the only cue.

## Not implemented (PRD "Should/Could" or out of scope)

- Accounts and server-side authorization. All data stays in the browser.
- Push and email notifications. Only in-app reminders exist.
- PDF export. Only CSV is available.
