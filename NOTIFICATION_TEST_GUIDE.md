# Quick Notification Test Guide

## ✅ Fixed Issues
1. **Order Creation** - Agency now gets notified when seller creates order
2. **Offer Acceptance** - Pickup agent now gets notified when seller accepts offer

## 🧪 Quick Test (5 minutes)

### Test 1: Order Creation Notification
**Steps:**
1. Open app, login as **Seller**
2. Go to "Find Agencies" → Select any agency
3. Enter quantities → Click "Send Order Request"
4. **Logout** from seller account
5. Login as **Agency** (use the agency account you sent order to)
6. Look at top-right corner → Should see notification bell with **red badge (1)**
7. Tap the bell icon → Should see notification: "New order from [Your Name] - X kg scrap. Review now!"
8. Tap the notification → Should navigate to order details

**Expected Result:** ✅ Agency receives notification immediately after seller creates order

---

### Test 2: Order Accept Notification
**Steps:**
1. Login as **Agency**
2. Go to "Orders" tab
3. Find a pending order → Tap "Accept"
4. **Logout** from agency account
5. Login as **Seller** (who created that order)
6. Look at notification bell → Should show **red badge**
7. Tap bell → Should see: "[Agency Name] accepted your order! Waiting for pickup agent offers."

**Expected Result:** ✅ Seller receives notification when agency accepts order

---

### Test 3: Weight Verification Notification
**Steps:**
1. Login as **Agency**
2. Find an order with status "Picked Up"
3. Tap "Verify Weight Now"
4. Enter verified weights → Tap "Verify & Notify Seller"
5. **Logout** from agency
6. Login as **Seller**
7. Check notifications → Should see: "Weight verified: X kg. Estimated payout: ₹X. Please verify."

**Expected Result:** ✅ Seller receives notification when weight is verified

---

### Test 4: Payment Distribution Notification
**Steps:**
1. Login as **Admin**
2. Go to "Payment Distribution" tab
3. Find an order with payment received
4. Tap "Distribute Payment"
5. **Logout** from admin
6. Login as **Seller**
7. Check notifications → Should see: "Payment of ₹X has been distributed to you. Order completed!"

**Expected Result:** ✅ Seller receives notification when payment is distributed

---

## 🔔 Notification Bell Features

### Bell Icon Location:
- **Seller**: Top-right of Orders screen
- **Agency**: Top-right of Orders screen  
- **Pickup Agent**: Top-right of Orders screen
- **Admin**: Not shown (admins don't need notifications in current flow)

### Bell Badge:
- Shows **red circle with number** when you have unread notifications
- Number shows count of unread notifications
- Disappears when all notifications are read

### Notification Screen:
- Tap bell → Opens full notification list
- **Unread** notifications have light blue background
- **Read** notifications have white background
- Tap "Mark all read" to mark all as read
- Tap any notification → Navigates to related order

---

## 🐛 Troubleshooting

### "I don't see the notification bell"
**Solution:** The bell only appears on these screens:
- AgencyOrders.js (Agency Orders tab)
- SellerOrders.js (Seller Orders tab)
- PickupOrders.js (Pickup Agent Orders tab)

If you're on a different screen, navigate to Orders tab first.

### "Bell shows but no notifications appear"
**Check:**
1. Make sure you're logged in as the correct user
2. Check Firebase Console → Firestore → `notifications` collection
3. Look for documents with `userId` matching your current user's UID
4. Check console logs for errors

### "Notifications appear but bell doesn't show count"
**Check:**
1. Make sure `read: false` in Firebase notification document
2. Check console for "Notification count error:"
3. Try logging out and back in

### "Tapping notification doesn't navigate"
**Check:**
1. Make sure notification has `orderId` field
2. Make sure OrderTracking screen is registered in App.js
3. Check console for navigation errors

---

## 📊 Complete Notification Types

| Event | Who Gets Notified | Notification Type | Status |
|-------|------------------|-------------------|--------|
| Order Created | Agency | new_order | ✅ WORKING |
| Order Accepted | Seller | order_accepted | ✅ WORKING |
| Order Rejected | Seller | order_rejected | ✅ WORKING |
| Pickup Offer Sent | Seller | pickup_offer | ⚠️ Not implemented |
| Offer Accepted | Pickup Agent | pickup_assigned | ✅ WORKING |
| Pickup Started | Seller | pickup_started | ⚠️ Not implemented |
| Pickup Completed | Seller | pickup_completed | ⚠️ Not implemented |
| Weight Verified | Seller | weight_verified | ✅ WORKING |
| Weight Accepted | Agency | weight_accepted | ✅ WORKING |
| Visit Requested | Agency | visit_requested | ✅ WORKING |
| Payment Sent | Admin | payment_received | ✅ WORKING |
| Payment Distributed | Seller & Agent | payment_distributed | ✅ WORKING |

---

## ✅ Success Criteria

Your notification system is working if:
1. ✅ Bell icon appears on Orders screens
2. ✅ Red badge shows unread count
3. ✅ Tapping bell opens NotificationsScreen
4. ✅ Notifications appear when actions happen
5. ✅ Tapping notification navigates to order
6. ✅ "Mark all read" removes badge

---

## 🎯 Next Steps

If basic notifications work but you want more:
1. Add pickup offer sent notification (when agent sends offer)
2. Add pickup started notification (when agent starts pickup)
3. Add pickup completed notification (when agent completes pickup)
4. Add push notifications (requires Expo Notifications setup)

---

**Need help?** Check NOTIFICATION_FIX.md for detailed technical information.
