# 🔍 DEBUG - Why You Can't See Buttons

## ✅ THE CODE IS CORRECT!

I just analyzed the entire AgencyOrders.js file:
- ✅ Line 164-168: "Verify Weight Now" button for `picked_up` status
- ✅ Line 178-182: "Process Payment to Admin" button for `verified` status
- ✅ All handlers are connected correctly
- ✅ All styles are defined

## 🚨 THE REAL PROBLEM

**You're not seeing the buttons because your orders don't have the right status!**

### Check Your Order Status:

**For "Verify Weight Now" button to appear:**
- Order status MUST be exactly: `picked_up`
- NOT `picked`, NOT `Picked Up`, NOT `picked-up`
- Exactly: `picked_up`

**For "Process Payment to Admin" button to appear:**
- Order status MUST be exactly: `verified`
- NOT `Verified`, NOT `seller_verified`, NOT `weight_verified`
- Exactly: `verified`

---

## 🔍 HOW TO CHECK YOUR ORDER STATUS

### Method 1: Check in Firebase Console
1. Open Firebase Console
2. Go to Firestore Database
3. Open `orders` collection
4. Find your order
5. Look at the `status` field
6. **What does it say?**

### Method 2: Add Debug Log
Add this to AgencyOrders.js line 60 (inside OrderCard function):
```javascript
console.log('Order Status:', order.status, 'ID:', order.id.slice(-6));
console.log('isPickedUp:', isPickedUp, 'isVerified:', isVerified);
```

Then check your console/terminal to see what status your orders have.

---

## 🎯 MOST LIKELY ISSUES

### Issue 1: Order Status is Wrong
**Your order status might be:**
- `picked` (wrong - should be `picked_up`)
- `completed` (already done)
- `accepted` (not picked up yet)
- `pending` (not accepted yet)

**Solution:** Manually update order status in Firebase to `picked_up`

### Issue 2: No Orders with Correct Status
**You might not have any orders with status `picked_up` or `verified`**

**Solution:** Create a test order and set its status

### Issue 3: App Not Restarted
**The old code is still running**

**Solution:** 
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Restart
npm start --reset-cache
```

---

## 🛠️ MANUAL TEST - DO THIS NOW

### Step 1: Create Test Order in Firebase

1. Open Firebase Console
2. Go to Firestore
3. Go to `orders` collection
4. Click "Add Document"
5. Use this data:

```json
{
  "id": "TEST_ORDER_001",
  "sellerId": "YOUR_USER_ID",
  "sellerName": "Test Seller",
  "agencyId": "YOUR_AGENCY_ID",
  "agencyName": "Test Agency",
  "status": "picked_up",
  "materials": [
    {
      "materialName": "Plastic",
      "quantityKg": 10,
      "pricePerKg": 50,
      "subtotal": 500
    }
  ],
  "totalKg": 10,
  "estimatedAmount": 500,
  "commissionPerKg": 10,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Step 2: Open AgencyOrders
1. Restart app
2. Login as Agency
3. Go to AgencyOrders
4. ✅ You MUST see purple "Verify Weight Now" button

### Step 3: If Still Not Showing
**Then there's a different problem - maybe:**
- Wrong user logged in (not the agencyId in the order)
- Firebase query not working
- App cache issue

---

## 🔍 DETAILED DEBUGGING

### Add This Debug Code

In `AgencyOrders.js`, add after line 220 (inside the map function):

```javascript
{filteredOrders.map(order => {
  console.log('=== ORDER DEBUG ===');
  console.log('Order ID:', order.id);
  console.log('Status:', order.status);
  console.log('Should show Verify Weight:', order.status === 'picked_up');
  console.log('Should show Process Payment:', order.status === 'verified');
  
  return (
    <OrderCard
      key={order.id}
      order={order}
      onAccept={handleAccept}
      onReject={handleReject}
      onTrack={handleTrack}
      onVerifyWeight={handleVerifyWeight}
      onProcessPayment={handleProcessPayment}
      actionLoading={actionLoading}
    />
  );
})}
```

Then check your console output!

---

## 📊 STATUS CHECKLIST

For each order in AgencyOrders, check:

**Status: `pending`**
- ✅ Should show: [Reject] [Accept] buttons
- ❌ Should NOT show: Verify Weight or Payment buttons

**Status: `accepted`**
- ✅ Should show: [Manage Pickup] button
- ❌ Should NOT show: Verify Weight or Payment buttons

**Status: `picked_up`**
- ✅ Should show: [Verify Weight Now] button (PURPLE)
- ❌ Should NOT show: Accept, Manage Pickup, or Payment buttons

**Status: `weight_verified`**
- ✅ Should show: Yellow "Waiting for seller..." banner
- ❌ Should NOT show: Any buttons

**Status: `verified`**
- ✅ Should show: [Process Payment to Admin] button (GREEN)
- ❌ Should NOT show: Other buttons

**Status: `payment_received`**
- ✅ Should show: Blue "Waiting for admin..." banner
- ❌ Should NOT show: Any buttons

**Status: `completed`**
- ✅ Should show: Green "Order completed!" banner
- ❌ Should NOT show: Any buttons

---

## 🎯 QUICK FIX - DO THIS

### Option 1: Update Existing Order
1. Open Firebase Console
2. Find an order
3. Change `status` field to `picked_up`
4. Save
5. Refresh AgencyOrders
6. ✅ Button should appear!

### Option 2: Use OrderTracking
1. Open any order
2. Go to OrderTracking screen
3. Use the status buttons there to advance to `picked_up`
4. Go back to AgencyOrders
5. ✅ Button should appear!

---

## ✅ VERIFICATION

After doing the above, you should see:

**In AgencyOrders with order status = `picked_up`:**
```
┌─────────────────────────────────┐
│ Order #ABC123                   │
│ Status: [Picked Up]             │
│ Materials: Plastic 10kg         │
│ Total Weight: 10 kg             │
│ Est. Payout: ₹500               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🔍 Verify Weight Now        │ │ ← THIS BUTTON!
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**If you DON'T see this, then:**
1. Check order status in Firebase (is it exactly `picked_up`?)
2. Check you're logged in as the correct agency
3. Check the order's `agencyId` matches your user ID
4. Add console.log to debug

---

## 🚨 FINAL CHECK

Run this in your terminal:
```bash
# Check if file was saved
type screens\AgencyOrders.js | findstr "verifyWeightBtn"
```

You should see:
```
verifyWeightBtn: {
<TouchableOpacity style={styles.verifyWeightBtn}
```

If you see this, the code is there. The problem is your order status!

---

**🔍 CHECK YOUR ORDER STATUS IN FIREBASE NOW!**

That's the issue - your orders don't have status `picked_up` or `verified`, so the buttons don't appear!
