/**
 * Run this script once to generate VAPID keys for Web Push.
 * Usage: node generate-vapid-keys.js
 *
 * Copy the output values into your environment variables:
 *  - VAPID_PUBLIC_KEY
 *  - VAPID_PRIVATE_KEY
 *  - VAPID_EMAIL  (e.g. mailto:admin@yourdomain.com)
 */
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== VAPID Keys Generated ===\n');
console.log('VAPID_PUBLIC_KEY=', vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=', vapidKeys.privateKey);
console.log('\nAdd these (plus VAPID_EMAIL) to your Render environment variables.');
console.log('⚠️  Keep the PRIVATE key secret and never commit it to git!\n');
