# 🔍 HOW TO SEE SELLER VERIFICATION

## 🎯 Why You Can't See It

**The Issue:**
When you create a test order using "Create Test Order", it uses YOUR account as BOTH:
- Seller (who created the order)
- Agency (who verifies weight)

**Result:**
- You won't see the verification alert in SellerOrders
- Because the order's sellerId matches your current user ID
- But you're logged in as Agency, not Seller

---

## ✅ SOLUTION: Use Two Different Accounts

### Method 1: Two Devices/Browsers (Recommended)

**Device 1 - Seller Account:**
1. Create account as Seller
2. Create real order (not test order)
3. Wait for agency to accept

**Device 2 - Agency Account:**
1. Create account as Agency
2. Accept the order
3. Mark as picked up
4. Verify weight

**Back to Device 1 - Seller:**
1. Refresh SellerOrders
2. ✅ See yellow "Verify Weight" alert!
3. Tap to open SellerVerificationScreen
4. Accept or request visit

---

### Method 2: One Device (Login/Logout)

**Step 1: Create Order as Seller**
1. Login as Seller account
2. Go to "Sell Scrap" or "Create Order"
3. Add materials
4. Submit order
5. **Logout**

**Step 2: Accept & Verify as Agency**
1. Login as Agency account
2. Go to Orders tab
3. Accept the order
4. Mark as "Picked Up"
5. Tap "Verify Weight Now"
6. Enter weights
7. Submit verification
8. **Logout**

**Step 3: Verify as Seller**
1. Login as Seller account (same as Step 1)
2. Go to Orders tab
3. ✅ See yellow "Verify Weight" alert!
4. Tap order card
5. SellerVerificationScreen opens
6. Review weight comparison
7. Choose: Accept or Visit

---

## 📱 What Seller Will See

### In SellerOrders Screen:
```
┌─────────────────────────────────────┐
│ Order #ABC123                       │
│ 🟡 Verify Weight                    │ ← Status badge
│                                     │
│ Materials...                        │
│ Total: 30kg, ₹1,100                 │
│                                     │
│ ⚠️ Tap to verify weight →          │ ← Yellow alert
└─────────────────────────────────────┘
```

### After Tapping:
```
┌─────────────────────────────────────┐
│ ← Verify Weight                     │
├─────────────────────────────────────┤
│ ⚠️ Weight Verification Required     │
│                                     │
│ Weight Comparison:                  │
│ Your Estimate  →  Verified          │
│    30 kg          30 kg             │
│                                     │
│ You'll Receive: ₹745                │
│                                     │
│ [📍 Visit] [✓ Accept & Pay]         │
└─────────────────────────────────────┘
```

---

## 🎯 Quick Test Setup

### Create Two Test Accounts:

**Account 1 - Seller:**
- Email: testseller@example.com
- Role: Seller
- Use for: Creating orders

**Account 2 - Agency:**
- Email: testagency@example.com
- Role: Agency/Buyer
- Use for: Accepting orders, verifying weight

---

## 🔄 Complete Test Flow

### 1. As Seller (Account 1):
```
Login → Create Order → Add materials → Submit → Logout
```

### 2. As Agency (Account 2):
```
Login → Orders → Accept → Picked Up → Verify Weight → Submit → Logout
```

### 3. As Seller (Account 1):
```
Login → Orders → See Alert → Tap → Verify → Accept → Logout
```

### 4. As Agency (Account 2):
```
Login → Orders → Process Payment → Pay → Done
```

---

## 💡 Why "Create Test Order" Doesn't Show Seller Alert

**What "Create Test Order" Does:**
```javascript
{
  sellerId: YOUR_USER_ID,
  agencyId: YOUR_USER_ID,  // Same user!
  status: 'picked_up'
}
```

**Problem:**
- Both seller and agency are YOU
- When you verify weight, YOU are the agency
- To see seller alert, YOU need to be the seller
- But you're logged in as agency

**Solution:**
- Use two different accounts
- Or create real order as seller
- Then login as different agency account

---

## ✅ Verification Checklist

To see seller verification alert, you need:

- [ ] Order created by Seller account
- [ ] Weight verified by Agency account
- [ ] Order status is "weight_verified"
- [ ] Logged in as the SELLER account (not agency)
- [ ] Open SellerOrders screen
- [ ] Order's sellerId matches current user ID

If all checked, you'll see the yellow alert!

---

## 🐛 Troubleshooting

### "I don't see the alert"

**Check:**
1. Are you logged in as SELLER (not agency)?
2. Is order status "weight_verified"?
3. Did agency verify the weight?
4. Is the order's sellerId YOUR user ID?

### "Alert appears but nothing happens when I tap"

**Check:**
1. Is SellerVerificationScreen registered in App.js? ✅ Yes
2. Check console for navigation errors
3. Restart app

### "I created test order but can't see it as seller"

**Reason:**
- Test order uses same account for both roles
- You need to be logged in as seller to see seller view
- But the order was created while logged in as agency

**Solution:**
- Use two different accounts
- Or create real order as seller first

---

## 📚 Summary

**To See Seller Verification:**
1. ✅ Use TWO different accounts (Seller + Agency)
2. ✅ Create order as Seller
3. ✅ Verify weight as Agency
4. ✅ Login as Seller to see alert
5. ✅ Tap alert to verify

**Don't:**
- ❌ Use "Create Test Order" and expect to see seller alert
- ❌ Use same account for both seller and agency
- ❌ Stay logged in as agency and check SellerOrders

---

**Use two accounts to test the complete seller verification workflow!** 🚀
