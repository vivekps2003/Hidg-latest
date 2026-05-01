import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Send notification to a user
export const sendNotification = async (userId, type, message, orderId = null) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      message,
      orderId,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Send notification error:', err);
  }
};

// Notification templates for different events
export const NotificationTemplates = {
  // For Seller
  orderAccepted: (agencyName) => ({
    type: 'order_accepted',
    message: `${agencyName} accepted your order! Waiting for pickup agent offers.`,
  }),
  
  orderRejected: (agencyName) => ({
    type: 'order_rejected',
    message: `${agencyName} rejected your order. Please try another agency.`,
  }),
  
  pickupAssigned: (agentName) => ({
    type: 'pickup_assigned',
    message: `${agentName} will pickup your scrap. Track the pickup status.`,
  }),
  
  pickupStarted: (agentName) => ({
    type: 'pickup_started',
    message: `${agentName} is on the way to pickup your scrap.`,
  }),
  
  pickupCompleted: (agentName) => ({
    type: 'pickup_completed',
    message: `${agentName} completed the pickup. Agency will verify weight.`,
  }),
  
  weightVerified: (totalKg, amount) => ({
    type: 'weight_verified',
    message: `Weight verified: ${totalKg} kg. Estimated payout: ₹${amount}. Please verify.`,
  }),
  
  paymentDistributed: (amount) => ({
    type: 'payment_distributed',
    message: `Payment of ₹${amount} has been distributed to you. Order completed!`,
  }),
  
  pickupOffer: (agentName, commission) => ({
    type: 'pickup_offer',
    message: `${agentName} sent a pickup offer with ₹${commission}/kg commission. Review now!`,
  }),

  // For Agency
  newOrder: (sellerName, totalKg) => ({
    type: 'new_order',
    message: `New order from ${sellerName} - ${totalKg} kg scrap. Review now!`,
  }),
  
  weightAccepted: (sellerName) => ({
    type: 'weight_accepted',
    message: `${sellerName} accepted the verified weight. Process payment now.`,
  }),
  
  visitRequested: (sellerName) => ({
    type: 'visit_requested',
    message: `${sellerName} wants to visit agency to verify weight.`,
  }),
  
  paymentReceived: (amount) => ({
    type: 'payment_received',
    message: `Admin received payment of ₹${amount}. Waiting for distribution.`,
  }),

  // For Pickup Agent
  orderAvailable: (totalKg, location) => ({
    type: 'new_order',
    message: `New order available: ${totalKg} kg scrap at ${location}. Send your offer!`,
  }),
  
  offerAccepted: (sellerName) => ({
    type: 'pickup_assigned',
    message: `${sellerName} accepted your offer! Start pickup now.`,
  }),
  
  paymentDistributedAgent: (amount) => ({
    type: 'payment_distributed',
    message: `Commission of ₹${amount} has been distributed to you!`,
  }),

  // For Admin
  paymentReceivedAdmin: (agencyName, amount) => ({
    type: 'payment_received',
    message: `${agencyName} paid ₹${amount}. Distribute to all parties now.`,
  }),
  
  orderCompleted: (orderId) => ({
    type: 'order_completed',
    message: `Order #${orderId.slice(-6).toUpperCase()} completed successfully!`,
  }),
};
