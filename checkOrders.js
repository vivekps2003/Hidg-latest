// Run this to check your order statuses
// node checkOrders.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you need to add your service account key)
// For now, this is a template - you need to configure it

console.log('=== ORDER STATUS CHECKER ===\n');
console.log('To use this script:');
console.log('1. Get your Firebase service account key');
console.log('2. Initialize Firebase Admin');
console.log('3. Query orders collection');
console.log('4. Check status of each order\n');

console.log('Expected statuses for buttons to appear:');
console.log('- "Verify Weight Now" button → status must be: picked_up');
console.log('- "Process Payment" button → status must be: verified\n');

console.log('Common statuses you might see:');
console.log('- pending: Order created, not accepted yet');
console.log('- accepted: Order accepted, pickup not done');
console.log('- picked_up: Pickup done, VERIFY WEIGHT BUTTON SHOWS');
console.log('- weight_verified: Weight verified, waiting for seller');
console.log('- verified: Seller accepted, PAYMENT BUTTON SHOWS');
console.log('- payment_received: Payment done, waiting for admin');
console.log('- completed: Order finished\n');

console.log('Check your Firebase Console manually:');
console.log('1. Go to Firebase Console');
console.log('2. Open Firestore Database');
console.log('3. Open "orders" collection');
console.log('4. Check the "status" field of your orders');
console.log('5. If status is NOT "picked_up" or "verified", buttons won\'t show\n');
