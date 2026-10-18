# Milemarker Motorcare Calendar — Product Requirements Document

Status: Reflects the implementation as of October 2026. Sections marked **[Current]** describe behavior that exists in the code today. Sections marked **[Future]** are recommendations only and are **not implemented**.

---

## 1. Product overview

Milemarker Motorcare Calendar (in-app name: "Oil & Tire Tracker") is a mobile-first web app that helps individual car owners track engine oil changes and tire changes for one or more personal vehicles. Owners log each service, keep the odometer up to date, and the app estimates when the next oil or tire service is due. A personal maintenance calendar shows past services and upcoming due dates.

The calendar tracks maintenance events (completed and estimated). It is **not** an appointment or booking system. The app is for individual owners, **not** service shops or fleets.

## 2. Problem statement

Car owners often forget when they last changed their oil or tires, at what mileage, and with what product. Service stickers get lost, and the "whichever comes first" rule (distance or time) is hard to track mentally, especially with multiple vehicles. Missed services lead to engine wear, unsafe tires, and higher costs.

## 3. Target users

- **Primary:** Individual car owners managing one or several personal vehicles (car, SUV, pickup, van, motorcycle).
- **Not targeted:** Repair shops, service centers, dealerships, fleet managers.

## 4. Goals and non-goals

### Goals
- Add a vehicle in under a minute.
- Record an oil or tire change in a few taps.
- Show, at a glance, whether each service is on track, due soon, or overdue.
- Keep a searchable-by-type history per vehicle.
- Provide a calendar view of past and upcoming maintenance.

### Non-goals
- Appointment booking, shop scheduling, or workshop management.
- Multi-user/shop accounts, invoicing, parts inventory.
- Maintenance types beyond engine oil and tires (in the current MVP).
- Social, marketplace, or advertising features.

## 5. Existing features and user flows [Current]

### Screens
| Path | Screen | Purpose |
|---|---|---|
| `/` | My vehicles | Vehicle list, due alerts, add vehicle |
| `/vehicle/$id` | Vehicle detail | Odometer update, status, record service, history, intervals, delete |
| `/calendar` | Calendar | Monthly calendar, day details, upcoming services |

A fixed bottom navigation offers **Vehicles** and **Calendar**. Vehicle detail shows a "← Back" link to the home screen.

### Flow A — Add first vehicle
1. With no vehicles, the home screen shows "Add your first vehicle".
2. User enters vehicle type (free text with suggestions: Sedan, Hatchback, SUV, Pickup, Van, Motorcycle; default "Sedan"), model, plate number, current mileage (km). All required.
3. Plate is trimmed and uppercased; model trimmed; mileage defaults to 0 if not numeric.
4. Vehicle is saved with default intervals and appears as a card.

### Flow B — Add another vehicle
"+ Add" button in the header (visible when at least one vehicle exists) opens the same form with a Cancel button.

### Flow C — View status on home
Each vehicle card shows type, model, plate, odometer, and for Engine oil and Tires: a status pill and a due line ("Next by <date> or <km>", plus days left/late and km left/over). Overdue and due-soon items also appear as alert banners at the top, linking to the vehicle.

### Flow D — Record a service
1. On vehicle detail, tap "+ Record" on the Engine oil or Tires card.
2. Form fields: Replacement date (default today, cannot be in the future, required), Mileage at service (default current odometer, required), Oil type / Tire type (optional), Notes (optional).
3. Save adds the record. If service mileage exceeds the vehicle's odometer, the odometer is raised to that mileage.

### Flow E — Update odometer
Vehicle detail has an odometer field showing the current value; entering a number and tapping Update sets the mileage (any value, including lower).

### Flow F — View and manage history
History lists records newest first with filter tabs (All / Engine oil / Tires). Each item shows product (or service type name), date, mileage, notes. Records can be deleted after a confirmation prompt.

### Flow G — Adjust intervals / delete vehicle
The settings (gear) icon reveals per-vehicle interval fields (km and months for oil and tires; minimum 1, saved immediately on change) and a "Delete vehicle" action that, after confirmation, removes the vehicle and all its records and returns home.

### Flow H — Calendar
See Section 7.

## 6. Functional requirements [Current]

| ID | Requirement |
|---|---|
| FR-1 | Users can create vehicles with type, model, plate, mileage. |
| FR-2 | Users can manage multiple vehicles independently. |
| FR-3 | Users can update a vehicle's odometer. |
| FR-4 | Users can record oil and tire changes with date, mileage, product type, notes. |
| FR-5 | Service dates cannot be later than today (date picker max). |
| FR-6 | Recording a higher service mileage auto-raises the odometer. |
| FR-7 | Users can view per-vehicle history, filtered by service type. |
| FR-8 | Users can delete records and vehicles (with confirmation). |
| FR-9 | Each vehicle has editable oil and tire intervals (km and months). |
| FR-10 | The app computes next due date/mileage and a status per service type. |
| FR-11 | Home shows alerts for overdue and due-soon services. |
| FR-12 | Calendar shows completed and upcoming/overdue maintenance events. |

Editing an existing record or vehicle details (other than mileage and intervals) is **not** supported.

## 7. Due-date calculation and calendar behavior [Current]

### Default intervals
- Engine oil: every **5,000 km or 6 months**
- Tires: every **40,000 km or 48 months**

### Calculation (per vehicle, per service type)
1. **Last service** = record with the latest date (ties broken by higher mileage).
2. No record → status **No record** ("Add a record to estimate next service").
3. `nextDate = lastDate + interval months` (calendar month addition).
4. `nextMileage = lastMileage + interval km`.
5. `daysLeft = nextDate − today` (in days); `kmLeft = nextMileage − current odometer`.
6. Status (whichever comes first):
   - **Overdue:** `daysLeft < 0` or `kmLeft ≤ 0`
   - **Due soon:** `daysLeft ≤ 14` or `kmLeft ≤ 10% of interval km`
   - **On track:** otherwise

Example (covered by `src/test/due.test.ts`): oil last done 2026-01-10 at 10,000 km, interval 5,000 km / 6 months → next 2026-07-10 or 15,000 km.

### Calendar
- Monthly grid, weeks start Monday; previous/next month buttons; today highlighted; selected day highlighted (defaults to today).
- Events:
  - **Done** (green dot): every recorded service on its date.
  - **Due** (amber dot): the computed next date for each vehicle/service type that has a record.
  - **Overdue** (red dot): a due event whose status is overdue (it remains at its original due date).
- Up to 3 dots per day; a legend explains colors.
- Selecting a day lists its events ("Done:", "Due:", "Overdue:" + service type, vehicle model · plate, mileage detail). Items link to the vehicle.
- "Upcoming services" lists all due/overdue estimates sorted by date.
- Note: a due event appears at the estimated date even when the status was triggered by mileage instead.

## 8. Data model [Current]

```text
Vehicle
  id         string (random)
  type       string
  model      string
  plate      string (uppercase)
  mileage    number (km)
  intervals  { oil: { km, months }, tire: { km, months } }

ServiceRecord
  id         string (random)
  vehicleId  string -> Vehicle.id
  kind       "oil" | "tire"
  date       string (YYYY-MM-DD)
  mileage    number (km)
  product    string (oil type or tire type; may be empty)
  notes      string | undefined
```

Storage: a single JSON object `{ vehicles, records }` in browser localStorage under key `carcare-v1`. Due information is computed on the fly, never stored.

## 9. Non-functional requirements

- **[Current]** Mobile-first single-column layout (max ~576px wide) with bottom navigation.
- **[Current]** Works without an account or network backend; data persists across reloads in the same browser.
- **[Current]** Units: kilometers; dates displayed in the browser's locale.
- **[Current]** Light visual theme with semantic color tokens for status (success/warning/destructive).
- **[Current]** Each page has its own title and description metadata.
- **[Future]** Accessibility audit (contrast, screen-reader labels for calendar days).
- **[Future]** Offline install (PWA).

## 10. MVP scope

**In scope (implemented):** vehicles CRUD (create, mileage/interval update, delete), oil and tire records (create, delete), due estimates and statuses, home alerts, per-vehicle history with filter, maintenance calendar, upcoming list.

**Out of scope for MVP:** accounts/sync, notifications, other maintenance types, editing records, data export, appointments.

## 11. Acceptance criteria [Current behavior]

1. Given no vehicles, the home screen shows the "Add your first vehicle" form.
2. Saving a vehicle with model "Toyota Vios 2020", plate "ygn 1a-2345", mileage 12000 shows a card with plate "YGN 1A-2345" and "12,000 km", both services "No record".
3. Recording oil on 2026-01-10 at 10,000 km (default intervals) shows next "10 Jul 2026" or "15,000 km".
4. If today is past the next date or the odometer is ≥ next mileage, oil status is "Overdue" and an alert appears on home.
5. If within 14 days or within 500 km (10% of 5,000), status is "Due soon".
6. Recording a service at a mileage above the odometer raises the odometer to that value.
7. The record date picker does not allow future dates.
8. History filter "Tires" shows only tire records.
9. Deleting a vehicle (after confirming) removes it and its records and returns to home.
10. The calendar shows a green dot on each service date and an amber/red dot on each estimated due date; tapping the day lists the events.
11. Changing the oil interval to 10,000 km immediately updates next mileage and status.
12. Data remains after a page reload in the same browser.

## 12. Assumptions

- One user per browser/device; no sharing between devices.
- Users record mileage in kilometers.
- "Whichever comes first" (time or distance) is the right rule for both oil and tires.
- Tire service is treated as a single "tire change" event (no rotation/pressure/alignment distinction).
- Default intervals are general guidance; owners adjust per vehicle based on their manual.

## 13. Known limitations [Current]

- Data is stored only in the local browser; clearing browser data or switching devices loses it. No backup or export.
- No sign-in, cloud sync, or multi-device access.
- No reminders or push/email notifications; users must open the app.
- Records and vehicle details (type, model, plate) cannot be edited—only deleted and re-entered.
- Odometer can be set lower than recorded service mileage without warning; no validation of decreasing mileage.
- Interval inputs save on every keystroke and clamp to a minimum of 1.
- Only engine oil and tires are tracked.
- Calendar shows only the next due event per service type (no recurring future projections).
- Overdue events stay on their original due date rather than moving to today.
- Kilometers only; no miles option.
- Due-date unit tests exist but their execution has not been confirmed in this project's workflow.

## 14. Future recommendations [Future — not implemented]

- Optional sign-in with cloud storage and sync across devices.
- Reminder notifications (email or push) before a service is due.
- Edit existing records and vehicle details.
- Export/import (CSV or PDF) of service history.
- Additional maintenance types (brake fluid, air filter, battery, tire rotation).
- Miles/kilometers setting.
- Warn when entered mileage is lower than previous records.
- Average daily distance to estimate the date a mileage threshold will be reached.
- Receipt photo attachments and cost tracking per service.
