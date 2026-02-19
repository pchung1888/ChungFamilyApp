# Trips & Expenses

Commands for managing trips and logging expenses via the API.
Make sure `npm run dev` is running at http://localhost:3000.

---

## List all trips

```bash
curl http://localhost:3000/api/trips
```

---

## Create a trip

**type** must be `"road_trip"`, `"flight"`, or `"local"`.

```bash
# Road trip with budget
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toronto Road Trip",
    "destination": "Toronto, ON",
    "startDate": "2026-07-04",
    "endDate": "2026-07-08",
    "budget": 2000,
    "type": "road_trip",
    "notes": "Canada Day long weekend"
  }'

# Flight trip (no budget)
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Miami Flight",
    "destination": "Miami, FL",
    "startDate": "2026-03-15",
    "type": "flight"
  }'
```

---

## Get a trip with all expenses

```bash
curl http://localhost:3000/api/trips/<id>
```

---

## Update a trip

```bash
curl -X PATCH http://localhost:3000/api/trips/<id> \
  -H "Content-Type: application/json" \
  -d '{"budget": 2500, "endDate": "2026-07-09"}'
```

---

## Delete a trip (and all its expenses)

```bash
curl -X DELETE http://localhost:3000/api/trips/<id>
```

---

## Add an expense to a trip

**category** must be one of: `hotel`, `flight`, `food`, `gas`, `ev_charging`, `tours`, `shopping`, `other`.
**familyMemberId** and **creditCardId** are optional — use IDs from `/api/family` and `/api/cards`.

```bash
# Hotel (with card and family member)
curl -X POST http://localhost:3000/api/trips/<tripId>/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "category": "hotel",
    "description": "Hampton Inn, 2 nights",
    "amount": 320.00,
    "date": "2026-07-04",
    "familyMemberId": "<memberId>",
    "creditCardId": "<cardId>",
    "pointsEarned": 960
  }'

# Gas (no card, no member)
curl -X POST http://localhost:3000/api/trips/<tripId>/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "category": "gas",
    "description": "Shell on I-90",
    "amount": 68.50,
    "date": "2026-07-04",
    "pointsEarned": 0
  }'
```

---

## Update an expense

```bash
curl -X PATCH http://localhost:3000/api/trips/<tripId>/expenses/<expenseId> \
  -H "Content-Type: application/json" \
  -d '{"amount": 340.00, "pointsEarned": 1020}'
```

---

## Delete an expense

```bash
curl -X DELETE http://localhost:3000/api/trips/<tripId>/expenses/<expenseId>
```
