

## Problem

When a selling partner is unapproved, some of their products still have `is_approved = true` in the database. Noorjahan's partner profile is unapproved, but 3 of her 9 products still show as approved and visible to customers.

**Root cause**: The cascading code was added recently but those 3 products were likely approved individually after the partner was unapproved, or the cascade didn't run for them.

## Plan

### 1. Fix existing data via migration
Run a SQL migration to set `is_approved = false` on all seller products where the partner's profile is unapproved:

```sql
UPDATE seller_products sp
SET is_approved = false
FROM profiles p
WHERE p.user_id = sp.seller_id
  AND p.is_approved = false
  AND sp.is_approved = true;
```

### 2. Create a database trigger for automatic cascading
Add a trigger on the `profiles` table so that whenever `is_approved` changes to `false` for a selling partner, all their `seller_products` are automatically set to `is_approved = false`. This prevents the issue from happening again regardless of how the profile is updated.

```sql
CREATE OR REPLACE FUNCTION cascade_partner_unapproval()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_approved = true AND NEW.is_approved = false 
     AND NEW.user_type = 'selling_partner' THEN
    UPDATE seller_products
    SET is_approved = false
    WHERE seller_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_partner_unapproval
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION cascade_partner_unapproval();
```

### 3. Keep existing frontend cascade code
The `toggleApproval` function in `SellingPartnersPage.tsx` already does the cascade — the trigger serves as a safety net for any path that updates the profile.

### Files changed
- **New migration**: SQL to fix data + create trigger

### No UI changes needed
All customer-facing queries already filter `is_approved = true`. Once the data is corrected and the trigger is in place, unapproved partner products will no longer appear.

