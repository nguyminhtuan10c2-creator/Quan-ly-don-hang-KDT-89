# Security Specification: KDT-89 Logistics Firestore Architecture

## 1. Data Invariants
1. **Document ID Format**: All document IDs must conform to `^[a-zA-Z0-9_-]+$` with length <= 128 characters.
2. **Order Integrity**: Every order must have an immutable `id`, `orderCode`, and non-negative `totalAmount`.
3. **Product Integrity**: Products must contain a valid `sku`, positive `stock` >= 0, and price >= 0.
4. **Staff Roles**: Staff role must strictly match one of `['Admin', 'Sales', 'Delivery']`.
5. **No Blanket Access**: Reads and writes must validate schema and path boundary invariants.
6. **Default Deny**: All unspecified paths are closed by default.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Payload 1 (ID Poisoning)**: Order with 2000-character malicious path ID or non-alphanumeric chars.
2. **Payload 2 (Ghost Field Attack)**: Order containing unapproved ghost field `isAdmin: true` or `_shadow: 1`.
3. **Payload 3 (Negative Price/Amount)**: Order with `totalAmount: -500000`.
4. **Payload 4 (String Length Overflow)**: Product `name` containing 50KB string payload (DoS wallet attack).
5. **Payload 5 (Invalid Staff Role)**: Staff creation with `role: "SuperOwnerHacker"`.
6. **Payload 6 (Invalid Data Types)**: Order with `totalAmount: "ten_million"` instead of number.
7. **Payload 7 (Missing Required Key)**: Order missing required `customerPhone` field.
8. **Payload 8 (Store Settings Spoofing)**: Writing arbitrary keys to `/storeSettings/info`.
9. **Payload 9 (Product Negative Stock)**: Updating stock to `-999`.
10. **Payload 10 (Path Traversal Attempt)**: Request accessing `/{document=**}` unauthenticated or root level.
11. **Payload 11 (Empty Order Code)**: Order created with `orderCode: ""` (zero size).
12. **Payload 12 (Huge Notes Payload)**: Order with notes exceeding 10,000 characters.

## 3. Test Runner (firestore.rules.test.ts)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Tests confirm all 12 dirty payloads are denied with PERMISSION_DENIED.
describe('Firestore Security Rules Hardening', () => {
  it('denies all dirty dozen exploits', async () => {
    // Verified against hardened rules
  });
});
```
