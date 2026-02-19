# Credit Cards & Benefits

Commands for managing credit cards and benefits via the API.
Make sure `npm run dev` is running at http://localhost:3000.

---

## List all cards (with benefits)

```bash
curl http://localhost:3000/api/cards
```

---

## Create a card

**network** must be `"Visa"`, `"Mastercard"`, `"Amex"`, or `"Discover"`.
**lastFour** must be exactly 4 digits.

```bash
# Chase Sapphire Reserve
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chase Sapphire Reserve",
    "network": "Visa",
    "lastFour": "1234",
    "annualFee": 550,
    "annualFeeDate": "2025-09-01",
    "pointsBalance": 80000,
    "pointsExpiresAt": null,
    "pointsName": "Chase Ultimate Rewards",
    "pointsCppValue": 1.5,
    "isActive": true
  }'

# Amex Platinum
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amex Platinum",
    "network": "Amex",
    "lastFour": "5678",
    "annualFee": 695,
    "pointsBalance": 120000,
    "pointsName": "Amex Membership Rewards",
    "pointsCppValue": 1.2,
    "isActive": true
  }'
```

---

## Update a card

Replace `<id>` with the actual card ID.

```bash
# Update points balance
curl -X PATCH http://localhost:3000/api/cards/<id> \
  -H "Content-Type: application/json" \
  -d '{"pointsBalance": 95000}'

# Mark inactive
curl -X PATCH http://localhost:3000/api/cards/<id> \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

---

## Delete a card

```bash
curl -X DELETE http://localhost:3000/api/cards/<id>
```

---

## List benefits for a card

```bash
curl http://localhost:3000/api/cards/<id>/benefits
```

---

## Add a benefit to a card

**frequency** must be `"annual"`, `"monthly"`, or `"per_trip"`.

```bash
# $300 travel credit (annual)
curl -X POST http://localhost:3000/api/cards/<id>/benefits \
  -H "Content-Type: application/json" \
  -d '{
    "name": "$300 Travel Credit",
    "value": 300,
    "frequency": "annual",
    "usedAmount": 0,
    "resetDate": "2026-01-01"
  }'

# $15 monthly Instacart credit
curl -X POST http://localhost:3000/api/cards/<id>/benefits \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instacart Credit",
    "value": 15,
    "frequency": "monthly",
    "usedAmount": 0
  }'
```

---

## Update a benefit

```bash
# Mark $150 used of a $300 travel credit
curl -X PATCH http://localhost:3000/api/cards/<cardId>/benefits/<benefitId> \
  -H "Content-Type: application/json" \
  -d '{"usedAmount": 150}'
```

---

## Delete a benefit

```bash
curl -X DELETE http://localhost:3000/api/cards/<cardId>/benefits/<benefitId>
```
