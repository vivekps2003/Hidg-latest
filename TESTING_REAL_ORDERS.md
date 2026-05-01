# 🎯 HOW TO TEST WITH REAL ORDERS

## ⚠️ Important: Test Navigation Uses Fake Data

The "Test Navigation" button shows you the UI but uses fake order data (TEST123) that doesn't exist in Firebase.

**You'll see this error if you try to save:**
```
Weight verification error: No document to update: orders/TEST123
```

This is NORMAL! Test Navigation is only for viewing the screens.

---

## ✅ TO TEST WITH REAL DATA

### Method 1: Create a Real Order (Recommended)

#### Step 1: Create Order as Seller
1. Login as Seller
2. Go to "Sell Scrap" or "Create Order"
3. Add materials (e.g., Plastic 10kg, Paper 20kg)
4. Submit order

#### Step 2: Accept as Agency
1. Logout and login as Agency
2. Go to "Orders" tab
3. Find the new order (status: "Pending")
4. Tap "Accept" button

#### Step 3: Mark as Picked Up
1. Open the accepted order
2. Tap "Mark as Picked Up"
3. Order status changes to "picked_up"

#### Step 4: Verify Weight (THIS IS THE NEW FEATURE!)
1. You'll see purple "Verify Weight Now" button
2. Tap it → WeightVerificationScreen opens
3. Tap "Use Original" to copy weights (or enter manually)
4. Tap "Verify & Notify Seller"
5. ✅ SUCCESS! Weight saved to Firebase

#### Step 5: Seller Verification
1. Logout and login as Seller
2. Go to "Orders" tab
3. See yellow "Verify Weight" alert
4. Tap order → SellerVerificationScreen opens
5. Review weight comparison
6. Tap "Accept & Pay"

#### Step 6: Payment
1. PaymentScreen opens
2. Select payment method
3. Enter details
4. Tap "Pay"
5. ✅ Order completed!

---

### Method 2: Use Existing Orders

If you already have orders in Firebase:

1. Login as Agency
2. Go to "Orders" tab
3. Find order with status "picked_up"
4. Tap purple "Verify Weight Now" button
5. Enter weights and save

---

## 🔍 WHERE TO FIND REAL ORDERS

### In AgencyOrders Screen:

```
┌─────────────────────────────────────┐
│ Incoming Orders                     │
├─────────────────────────────────────┤
│ Filters: [All] [Pending] [Accepted]│
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Order #ABC123                   │ │
│ │ 🟡 Picked Up                    │ │
│ │                                 │ │
│ │ Materials...                    │ │
│ │                                 │ │
│ │ [🟣 Verify Weight Now]          │ │ ← TAP THIS!
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 QUICK TEST WORKFLOW

### 5-Minute Complete Test:

**Preparation (1 min):**
1. Have 2 accounts ready (Seller + Agency)
2. Or use 2 devices/browsers

**Create & Accept (2 min):**
1. Seller: Create order with 2-3 materials
2. Agency: Accept the order
3. Agency: Mark as "Picked Up"

**Test New Features (2 min):**
1. Agency: Tap "Verify Weight Now" ✅
2. Agency: Tap "Use Original" ✅
3. Agency: Submit verification ✅
4. Seller: See verification alert ✅
5. Seller: Tap order to verify ✅
6. Seller: Accept & proceed to payment ✅
7. Complete payment ✅

**Total: 5 minutes to test everything!**

---

## 🐛 TROUBLESHOOTING

### "No document to update" Error

**Cause:** Using test data from NavigationTest

**Solution:** Use real orders from Orders tab

### "Can't find orders with picked_up status"

**Cause:** No orders at that stage

**Solution:** 
1. Create new order
2. Accept it
3. Mark as picked up

### "Verify Weight button doesn't appear"

**Cause:** Order status is not "picked_up"

**Solution:**
1. Check order status
2. Must be exactly "picked_up"
3. Use OrderTracking to advance status

---

## 💡 PRO TIPS

### Tip 1: Use Test Accounts
Create dedicated test accounts:
- test-seller@example.com
- test-agency@example.com

### Tip 2: Keep Test Orders
Don't delete test orders - reuse them for testing

### Tip 3: Check Firebase Console
Open Firebase Console to see data updates in real-time

### Tip 4: Use Console Logs
Keep Metro bundler console open to see errors

### Tip 5: Test Edge Cases
- Zero weight
- Empty fields
- Very large numbers
- Decimal values

---

## 📋 TESTING CHECKLIST

### Basic Flow:
- [ ] Create order as seller
- [ ] Accept as agency
- [ ] Mark as picked up
- [ ] See "Verify Weight Now" button
- [ ] Tap button → Screen opens
- [ ] Enter weights
- [ ] Submit successfully
- [ ] No errors in console

### Advanced Flow:
- [ ] Use "Use Original" button
- [ ] Modify some weights
- [ ] See real-time calculations
- [ ] Submit verification
- [ ] Seller sees alert
- [ ] Seller opens verification screen
- [ ] Seller accepts weight
- [ ] Payment screen opens
- [ ] Complete payment
- [ ] Order marked as completed

### Error Handling:
- [ ] Try submitting empty weights → Shows error
- [ ] Try submitting zero total → Shows error
- [ ] Check console for detailed errors
- [ ] Verify error messages are helpful

---

## 🎊 SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Can create and accept real order
2. ✅ "Verify Weight Now" button appears
3. ✅ WeightVerificationScreen opens
4. ✅ Can enter and save weights
5. ✅ Data saves to Firebase (no errors)
6. ✅ Seller sees verification alert
7. ✅ Complete workflow works end-to-end

---

## 🆘 STILL HAVING ISSUES?

### Check These:

1. **Firebase Connection**
   - Is Firebase initialized?
   - Are credentials correct?
   - Is internet connected?

2. **Firestore Rules**
   - Can agency update orders?
   - Can seller read orders?
   - Are rules configured?

3. **Order Data**
   - Does order exist in Firebase?
   - Is order ID correct?
   - Does order have materials array?

4. **Console Errors**
   - Any red errors?
   - Any warnings?
   - What's the exact error message?

---

## 📞 DEBUGGING STEPS

If weight verification fails:

1. **Open Metro Console**
2. **Look for:** "Weight verification error:"
3. **Read the error message**
4. **Common errors:**
   - "No document" → Order doesn't exist
   - "Permission denied" → Check Firestore rules
   - "Network error" → Check internet
   - "Invalid data" → Check order structure

5. **Fix and retry**

---

## 🎯 REMEMBER

**Test Navigation = View Only (Fake Data)**
- Good for: Seeing the UI
- Bad for: Testing functionality

**Real Orders = Full Testing (Real Data)**
- Good for: Complete workflow testing
- Required for: Saving to Firebase

**Always use real orders to test the complete workflow!**

---

**Now go create a real order and test the full workflow!** 🚀
