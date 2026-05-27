# Few-shot 03 — Multi-lane process with message flow

**Pattern:** Three actors with hand-offs between them.
**Teaches:** Identifying multiple lanes from prose, ordering them
sensibly, letting the parser auto-classify cross-lane arrows as
message flow.

---

## Input

> When a purchase order arrives, Procurement validates the order
> details and forwards it to the Warehouse, which checks stock. If
> stock is sufficient, the Warehouse prepares the shipment and ships
> the goods, then notifies Finance to issue an invoice. If stock is
> insufficient, Procurement is informed and contacts the customer to
> reschedule. Finance issues the invoice and closes the case once
> payment is received.

## Output

```laneflow
laneflow v0.1

lane Procurement  "Procurement"
lane Warehouse    "Warehouse"
lane Finance      "Finance"

Procurement: start         (Purchase order received)
Procurement: validate      [Validate order details]
Procurement: reschedule    [Contact customer to reschedule]
Warehouse:   check_stock   [Check stock]
Warehouse:   in_stock      <Stock sufficient?>
Warehouse:   prepare       [Prepare shipment]
Warehouse:   ship          [Ship goods]
Finance:     invoice       [Issue invoice]
Finance:     wait_payment  (Payment received)
Finance:     done          ((Case closed))

start --> validate --> check_stock
check_stock --> in_stock
in_stock -- yes --> prepare --> ship
ship --> invoice
in_stock -- no --> reschedule --> done
invoice --> wait_payment --> done
```

## Notes

- Three actors → three lanes. Declaration order matches the natural
  flow of the process (Procurement first, since it receives the
  trigger).
- "Forwards it to the Warehouse" is a cross-lane arrow
  (`validate --> check_stock`) — the parser will mark it as a message
  flow automatically. Do not invent a different arrow style for it.
- "Notifies Finance" is similarly a cross-lane arrow
  (`ship --> invoice`).
- "Payment received" is an event in Finance — something that happens,
  not something Finance does. So it uses `(text)`, not `[text]`.
- The rejection branch (`in_stock -- no --> reschedule`) goes back to
  Procurement. This is also a message flow because it crosses lanes.
- Both end paths converge at the single `done` end event in Finance.
  This is fine modeling: a process can have one end event regardless
  of how many paths lead to it.
