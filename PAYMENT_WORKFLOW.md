# Payment & Weight Verification System

## Overview
Complete payment and weight verification system ensuring orders are completed only after payment and proper weight verification with seller approval.

## Workflow

### 1. Order Creation → Acceptance
- Seller creates order with estimated weight
- Agency reviews and accepts/rejects order

### 2. Pickup
- Order status: `accepted` → `picked_up`
- Materials collected from seller location

### 3. Weight Verification (Agency)
**Screen: WeightVerificationScreen.js**
- Agency weighs materials at their facility
- Enter exact verified weight for each material
- System recalculates:
  - Total weight
  - Total amount
  - Pickup commission (if applicable)
  - Seller net amount
- Status: `picked_up` → `weight_verified`
- Seller is notified

### 4. Seller Verification
**Screen: SellerVerificationScreen.js**

Seller has 2 options:

#### Option A: Accept Weight
- Review verified weight vs original estimate
- See payment breakdown
- Accept and proceed to payment
- Status: `weight_verified` → `verified`

#### Option B: Request Physical Verification
- Seller has doubts about weight
- Request to visit agency in person
- Status: `weight_verified` → `visit_requested`
- Order paused until seller visits and verifies
- After physical verification: `visit_requested` → `verified`

### 5. Payment Processing
**Screen: PaymentScreen.js**
- Status: `verified` → `paid`
- Payment methods:
  - UPI
  - Card
  - Net Banking
  - Cash on Delivery
- Enter payment details
- Process payment
- Order data updated with:
  - `paymentStatus: 'paid'`
  - `paymentMethod`
  - `paidAmount`
  - `paidAt` timestamp

### 6. Order Completion
- Status: `paid` → `completed`
- Order marked as complete
- Payment released to seller
- Analytics updated

## Order Status Flow

```
pending
  ↓
accepted
  ↓
picked_up
  ↓
weight_verified ←→ visit_requested (if seller requests)
  ↓
verified
  ↓
paid
  ↓
completed
```

## Key Features

### 1. Weight Verification
- Agency enters exact measured weight
- Automatic recalculation of amounts
- Commission adjustment if pickup agent involved
- Seller notification

### 2. Seller Protection
- Review weight before payment
- Option to physically verify at agency
- See detailed breakdown of charges
- Accept only when satisfied

### 3. Payment Security
- Order completes ONLY after payment
- Multiple payment methods
- Payment details stored
- Timestamp tracking

### 4. Commission Handling
- If pickup agent involved:
  - Gross amount calculated
  - Commission deducted (₹X/kg × total kg)
  - Net amount shown to seller
- All amounts transparent

## Database Fields

### Order Document
```javascript
{
  // Weight verification
  weightVerified: true,
  weightVerifiedAt: timestamp,
  
  // Seller verification
  sellerVerified: true,
  sellerVerifiedAt: timestamp,
  sellerVerificationRequired: true,
  sellerVisitRequested: false,
  sellerVisitRequestedAt: timestamp,
  
  // Payment
  paymentStatus: 'paid',
  paymentMethod: 'upi',
  paymentDetails: 'user@upi',
  paidAmount: 5000,
  paidAt: timestamp,
  
  // Amounts
  estimatedAmount: 5000,
  totalCommission: 500,
  sellerNetAmount: 4500,
  
  // Status
  status: 'completed'
}
```

## Screens

### 1. WeightVerificationScreen.js
- **Used by**: Agency/Scrap Center
- **Purpose**: Enter verified weight after pickup
- **Navigation**: From OrderTracking when status is `picked_up`

### 2. SellerVerificationScreen.js
- **Used by**: Seller
- **Purpose**: Verify weight and approve/request visit
- **Navigation**: From SellerOrders when status is `weight_verified`
- **Actions**:
  - Accept & Pay → Navigate to PaymentScreen
  - Visit to Verify → Update status to `visit_requested`

### 3. PaymentScreen.js
- **Used by**: Buyer/Agency (paying party)
- **Purpose**: Process payment to seller
- **Navigation**: From OrderTracking or SellerVerificationScreen when status is `verified`
- **Payment Methods**: UPI, Card, Net Banking, Cash

## UI Indicators

### SellerOrders.js
- Shows "Verify Weight" alert for `weight_verified` status
- Tap to open SellerVerificationScreen
- Visual indicators for all statuses

### OrderTracking.js
- Special buttons for weight verification and payment
- "Awaiting seller verification" indicator
- "Payment processing" indicator
- Progress steps showing complete workflow

## Security & Validation

1. **Weight Verification**
   - Cannot be zero
   - Must be numeric
   - Recalculates all amounts

2. **Payment**
   - Required payment details (except cash)
   - Confirmation dialog
   - Error handling

3. **Status Transitions**
   - Sequential flow enforced
   - Cannot skip steps
   - Timestamps for audit trail

## Integration Points

### Firestore Rules Required
```javascript
// Allow agency to verify weight
match /orders/{orderId} {
  allow update: if request.auth.uid == resource.data.agencyId
    && request.resource.data.status == 'weight_verified';
}

// Allow seller to verify
match /orders/{orderId} {
  allow update: if request.auth.uid == resource.data.sellerId
    && (request.resource.data.status == 'verified' 
        || request.resource.data.status == 'visit_requested');
}

// Allow payment processing
match /orders/{orderId} {
  allow update: if request.auth.uid == resource.data.agencyId
    && request.resource.data.paymentStatus == 'paid';
}
```

## Testing Checklist

- [ ] Agency can verify weight after pickup
- [ ] Seller receives notification for weight verification
- [ ] Seller can accept weight and proceed to payment
- [ ] Seller can request physical verification visit
- [ ] Payment screen shows correct amounts
- [ ] Payment methods work correctly
- [ ] Order completes only after payment
- [ ] Commission calculated correctly when pickup agent involved
- [ ] All status transitions work properly
- [ ] Analytics updated after completion

## Future Enhancements

1. **Payment Gateway Integration**
   - Razorpay/Stripe integration
   - Automatic payment verification
   - Refund handling

2. **Notifications**
   - Push notifications for weight verification
   - SMS alerts for payment
   - Email receipts

3. **Dispute Resolution**
   - Dispute filing system
   - Admin intervention
   - Evidence upload (photos)

4. **Digital Signatures**
   - Seller signature on weight acceptance
   - Agency signature on payment
   - Legal compliance
