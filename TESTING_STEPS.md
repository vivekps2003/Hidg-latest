# 🔍 EXACT TESTING STEPS - Seller Verification

## ❌ Why You Can't See the Accept Button

**The order status is still `picked_up`!**

You need to **verify the weight first** to change status to `weight_verified`, THEN the seller verification alert will appear.

---

## ✅ CORRECT TESTING FLOW

### Step 1: Create Test Order
1. Open app as Agency
2. Go to AgencyHome
3. Tap **"Create Test Order"** (green button)
4. Tap **"Create Test Order in Firebase"**
5. Order created with status: `picked_up` ✅

### Step 2: Verify Weight (Agency)
1. Stay logged in as Agency
2. Go to **AgencyOrders** screen
3. Find the test order you just created
4. Tap the purple **"Verify Weight Now"** button
5. Enter verified weights (or tap "Use Original")
6. Tap **"Verify & Notify Seller"**
7. Status changes to: `weight_verified` ✅

### Step 3: See Seller Verification Alert
**NOW you'll see the accept button!**

**Option A - Same Account (Quick Test):**
1. Go to **SellerOrders** screen
2. You'll see a **YELLOW ALERT** at bottom of order card
3. Text says: "Tap to verify weight"
4. **TAP THE ENTIRE CARD** (not just the alert)
5. Opens SellerVerificationScreen ✅
6. See **"Accept & Pay"** button ✅

**Option B - Different Account (Full Test):**
1. Logout from Agency account
2. Login as Seller account
3. Go to SellerOrders
4. See yellow verification alert
5. Tap card to open SellerVerificationScreen
6. See "Accept & Pay" button

---

## 🎯 QUICK TEST (5 Minutes)

```
1. AgencyHome → "Create Test Order" → Create
2. AgencyOrders → Find order → "Verify Weight Now"
3. Enter weights → "Verify & Notify Seller"
4. SellerOrders → Tap order card with yellow alert
5. See "Accept & Pay" button! ✅
```

---

## 🔴 Common Mistakes

### Mistake 1: Not Verifying Weight First
- ❌ Create order → Check SellerOrders immediately
- ✅ Create order → Verify weight → Check SellerOrders

### Mistake 2: Looking for Button in Wrong Place
- ❌ Looking for button inside SellerOrders card
- ✅ Tap the ENTIRE card to open SellerVerificationScreen

### Mistake 3: Wrong Order Status
- ❌ Order status: `picked_up` (no alert shown)
- ✅ Order status: `weight_verified` (yellow alert shown)

---

## 📱 What You Should See

### In SellerOrders (after weight verification):
```
┌─────────────────────────────────┐
│ Order Card                      │
│ Materials, weights, amounts...  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚠️ Tap to verify weight  → │ │ ← YELLOW ALERT
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### In SellerVerificationScreen (after tapping card):
```
┌─────────────────────────────────┐
│ Weight Comparison               │
│ Your Estimate → Verified Weight │
│                                 │
│ Payment Summary                 │
│ You'll Receive: ₹745            │
│                                 │
│ ┌──────────┐  ┌──────────────┐ │
│ │ Visit to │  │ Accept & Pay │ │ ← THESE BUTTONS
│ │  Verify  │  │              │ │
│ └──────────┘  └──────────────┘ │
└─────────────────────────────────┘
```

---

## 🐛 Still Not Working?

### Check Order Status:
1. Open Firebase Console
2. Go to Firestore Database
3. Find your order in `orders` collection
4. Check `status` field:
   - If `picked_up` → Need to verify weight first
   - If `weight_verified` → Should see alert in SellerOrders

### Check SellerOrders Code:
Line 38 in SellerOrders.js:
```javascript
const needsVerification = item.status === 'weight_verified';
```

This checks if status is exactly `'weight_verified'`.

### Check You're on Right Screen:
- ✅ SellerOrders screen (shows "My Orders" at top)
- ❌ AgencyOrders screen (shows "Agency Orders" at top)

---

## ✅ Success Checklist

- [ ] Created test order (status: `picked_up`)
- [ ] Verified weight as Agency (status: `weight_verified`)
- [ ] Opened SellerOrders screen
- [ ] See yellow alert at bottom of order card
- [ ] Tapped entire card (not just alert)
- [ ] SellerVerificationScreen opened
- [ ] See "Accept & Pay" and "Visit to Verify" buttons

**If all checked, you're done!** 🎉

---

## 💡 Pro Tip

Use **OrderTracking** screen to see current status:
1. Tap any order in SellerOrders or AgencyOrders
2. See the 7-step progress bar at top
3. Current step is highlighted
4. Shows exactly where order is in workflow

---

**The feature is working correctly!** You just need to complete the weight verification step first. 🚀
