# Family Members

Commands for managing family members via the API.
Make sure `npm run dev` is running at http://localhost:3000.

---

## List all members

```bash
curl http://localhost:3000/api/family
```

---

## Create a member

**Role** must be `"parent"` or `"teen"`. Email is optional.

```bash
# Parent
curl -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Ping Chung", "role": "parent", "email": "ping@example.com"}'

# Parent (no email)
curl -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Spouse Name", "role": "parent"}'

# Teen
curl -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Daughter 1", "role": "teen"}'

# Teen
curl -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Daughter 2", "role": "teen"}'
```

---

## Seed all 4 Chung family members at once

Copy-paste this block to add all four members in one shot:

```bash
curl -s -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Ping Chung", "role": "parent"}' | python -m json.tool

curl -s -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Spouse Chung", "role": "parent"}' | python -m json.tool

curl -s -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Daughter 1", "role": "teen"}' | python -m json.tool

curl -s -X POST http://localhost:3000/api/family \
  -H "Content-Type: application/json" \
  -d '{"name": "Daughter 2", "role": "teen"}' | python -m json.tool
```

---

## Update a member

Replace `<id>` with the actual ID from the list response.

```bash
curl -X PATCH http://localhost:3000/api/family/<id> \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "role": "parent", "email": "new@example.com"}'
```

---

## Delete a member

```bash
curl -X DELETE http://localhost:3000/api/family/<id>
```
