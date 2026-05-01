# Quick Implementation Guide

## Files Created

### 1. PaymentScreen.js
**Location**: `screens/PaymentScreen.js`
**Purpose**: Handle payment processing for orders
**Features**:
- Multiple payment methods (UPI, Card, Net Banking, Cash)
- Payment details input
- Order summary display
- Commission breakdown
- Payment confirmation

### 2. WeightVerificationScreen.js
**Location**: `screens/WeightVerificationScreen.js`
**Purpose**: Agency verifies exact weight after pickup
**Features**:
- Input verified weight for each material
- Real-time calculation of totals
- Commission recalculation
- Seller notification trigger

### 3. SellerVerificationScreen.js
**Location**: `screens/SellerVerificationScreen.js`
**Purpose**: Seller verifies weight before payment
**Features**:
- Weight comparison (estimate vs verified)
- Accept weight option
- Request physical verification option
- Payment summary preview

## Files Modified

### 1. OrderTracking.js
**Changes**:
- Added new status steps: `weight_verified`, `verified`, `paid`
- Added special action buttons for weight verification and payment
- Added waiting indicators for seller verification and payment
- Updated status flow logic

### 2. SellerOrders.js
**Changes**:
- Added new status types
- Added verification alert for `weight_verified` status
- Made cards tappable when verification needed
- Added navigation to SellerVerificationScreen

### 3. App.js
**Changes**:
- Imported new screens
- Added routes for PaymentScreen, WeightVerificationScreen, SellerVerificationScreen

## Usage Flow

### For Agency (After Pickup):
1. Navigate to OrderTracking
2. When status is `picked_up`, tap "Verify Weight"
3. Enter exact measured weight for each material
4. Review totals and commission
5. Tap "Verify & Notify Seller"
6. Seller receives notification

### For Seller (Weight Verification):
1. Open SellerOrders
2. See "Verify Weight" alert on order
3. Tap order to open SellerVerificationScreen
4. Review weight comparison
5. Choose:
   - **Accept & Pay**: Proceed to payment
   - **Visit to Verify**: Request physical verification

### For Payment Processing:
1. After seller verification, navigate to PaymentScreen
2. Select payment method
3. Enter payment details
4. Review order summary
5. Tap "Pay" button
6. Order marked as paid

## Order Status Progression

```
1. pending          → Agency reviews
2. accepted         → Agency accepts order
3. picked_up        → Materials collected
4. weight_verified  → Agency verified weight
5. verified         → Seller approved weight
6. paid             → Payment completed
7. completed        → Order finished
```

**Alternative Path**:
- `weight_verified` → `visit_requested` (seller wants to visit)
- After visit: `visit_requested` → `verified`

## Key Functions

### WeightVerificationScreen
```javascript
calculateTotals() // Recalculates weight and amounts
handleVerify()    // Updates order with verified weight
```

### SellerVerificationScreen
```javascript
handleAcceptWeight()   // Seller accepts, proceeds to payment
handleRequestVisit()   // Seller requests physical verification
```

### PaymentScreen
```javascript
handlePayment()  // Processes payment and updates order
```

## Database Updates

### Weight Verification
```javascript
{
  materials: [...],           // Updated with verified weights
  totalKg: 45.5,
  estimatedAmount: 5000,
  weightVerified: true,
  weightVerifiedAt: timestamp,
  status: 'weight_verified',
  sellerVerificationRequired: true
}
```

### Seller Verification (Accept)
```javascript
{
  sellerVerified: true,
  sellerVerifiedAt: timestamp,
  status: 'verified'
}
```

### Seller Verification (Visit Request)
```javascript
{
  sellerVisitRequested: true,
  sellerVisitRequestedAt: timestamp,
  status: 'visit_requested'
}
```

### Payment
```javascript
{
  paymentStatus: 'paid',
  paymentMethod: 'upi',
  paymentDetails: 'user@upi',
  paidAmount: 5000,
  paidAt: timestamp,
  status: 'paid'
}
```

## Navigation Routes

```javascript
// From OrderTracking (Agency)
navigation.navigate('WeightVerificationScreen', { order })
navigation.navigate('PaymentScreen', { order })

// From SellerOrders (Seller)
navigation.navigate('SellerVerificationScreen', { order })

// From SellerVerificationScreen (Seller)
navigation.replace('PaymentScreen', { order })
```

## Styling

All screens use consistent theming:
- **Agency screens**: Use `agencyTheme.js` (A, AS, AR)
- **Seller screens**: Use `theme.js` (C, S, R)
- Cards with shadows and borders
- Color-coded status indicators
- Responsive layouts

## Testing Steps

1. **Create Order**: Seller creates order with materials
2. **Accept Order**: Agency accepts order
3. **Mark Picked Up**: Agency marks as picked up
4. **Verify Weight**: Agency enters verified weight
5. **Seller Notification**: Check seller sees verification alert
6. **Seller Accept**: Seller accepts weight
7. **Process Payment**: Complete payment
8. **Order Complete**: Verify order marked as completed

## Error Handling

All screens include:
- Try-catch blocks for Firebase operations
- Alert dialogs for errors
- Loading states during operations
- Permission denied handling
- Validation before submission

## Next Steps

1. Update Firestore security rules
2. Test complete workflow end-to-end
3. Add push notifications for weight verification
4. Integrate payment gateway (optional)
5. Add receipt generation
6. Implement dispute resolution system
