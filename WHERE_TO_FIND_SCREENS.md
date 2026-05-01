# 📍 WHERE TO FIND THE NEW SCREENS - VISUAL GUIDE

## ✅ ALL SCREENS ARE CREATED AND WORKING!

### 📂 Files Created (All exist in `screens/` folder):
- ✅ SupportScreen.js (15,207 bytes)
- ✅ ComplaintScreen.js (18,344 bytes)
- ✅ TermsAndConditionsScreen.js (12,679 bytes)
- ✅ PrivacyPolicyScreen.js (11,334 bytes)

### ✅ All Registered in App.js (Lines 31-34, 76-79)

---

## 🎯 HOW TO ACCESS THEM:

### Step-by-Step Instructions:

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Login as Seller:**
   - Use any seller account (Individual/Shop/Mall/etc.)
   - Email: seller@test.com (or your seller email)

3. **Go to Profile Tab:**
   - Look at bottom navigation bar
   - Tap the **"Profile"** tab (rightmost icon)

4. **Scroll Down Past:**
   - Profile picture
   - Email/Phone info
   - Performance stats (Orders, kg Sold, Earnings)
   - "Edit Profile" button (blue gradient)

5. **YOU'LL SEE A DARK CARD WITH 4 BUTTONS:**

```
┌─────────────────────────────────────┐
│  🔵 Help & Support            →     │
├─────────────────────────────────────┤
│  🔴 File Complaint            →     │
├─────────────────────────────────────┤
│  🟣 Terms & Conditions        →     │
├─────────────────────────────────────┤
│  🟢 Privacy Policy            →     │
└─────────────────────────────────────┘
```

6. **Below that:**
   - Red "Logout" button

---

## 🔍 EXACT LOCATION IN CODE:

**File:** `screens/Sellerprofile.js`
**Lines:** 283-313

```javascript
{/* Support & Legal Links */}
<View style={styles.linksSection}>
  <TouchableOpacity 
    style={styles.linkBtn}
    onPress={() => navigation.navigate('SupportScreen')}
  >
    <Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
    <Text style={styles.linkText}>Help & Support</Text>
    <Ionicons name="chevron-forward" size={18} color="#64748b" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.linkBtn}
    onPress={() => navigation.navigate('ComplaintScreen')}
  >
    <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
    <Text style={styles.linkText}>File Complaint</Text>
    <Ionicons name="chevron-forward" size={18} color="#64748b" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.linkBtn}
    onPress={() => navigation.navigate('TermsAndConditionsScreen')}
  >
    <Ionicons name="document-text-outline" size={20} color="#8b5cf6" />
    <Text style={styles.linkText}>Terms & Conditions</Text>
    <Ionicons name="chevron-forward" size={18} color="#64748b" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.linkBtn}
    onPress={() => navigation.navigate('PrivacyPolicyScreen')}
  >
    <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
    <Text style={styles.linkText}>Privacy Policy</Text>
    <Ionicons name="chevron-forward" size={18} color="#64748b" />
  </TouchableOpacity>
</View>
```

---

## 🎨 VISUAL APPEARANCE:

The buttons are in a **dark card** (#1e293b background) with:
- Each button has an icon on the left (colored)
- Text in the middle (white)
- Arrow icon on the right (gray)
- Buttons are stacked vertically
- Located between "Edit Profile" and "Logout" buttons

---

## 🐛 TROUBLESHOOTING:

### If you DON'T see the buttons:

1. **Make sure you're logged in as SELLER:**
   - Not Agency, not Pickup Agent
   - Account type must be: Individual/Shop/Mall/Supermarket/Industry

2. **Restart the app:**
   ```bash
   # Stop the app (Ctrl+C)
   npm start
   # Press 'a' for Android or 'i' for iOS
   ```

3. **Clear cache:**
   ```bash
   npm start -- --clear
   ```

4. **Check you're on Profile tab:**
   - Bottom navigation → Rightmost tab
   - Should show your name and stats

5. **Scroll down:**
   - The buttons are BELOW the stats
   - Keep scrolling past "Edit Profile"

---

## ✅ VERIFICATION:

### To confirm everything is working:

1. **Check files exist:**
   ```bash
   dir screens\SupportScreen.js
   dir screens\ComplaintScreen.js
   dir screens\TermsAndConditionsScreen.js
   dir screens\PrivacyPolicyScreen.js
   ```
   All should show file sizes

2. **Check App.js has imports:**
   Open `App.js` and search for:
   - `import SupportScreen`
   - `import ComplaintScreen`
   - `import TermsAndConditionsScreen`
   - `import PrivacyPolicyScreen`

3. **Check Sellerprofile.js has buttons:**
   Open `screens/Sellerprofile.js` and search for:
   - `SupportScreen`
   - `ComplaintScreen`
   - `TermsAndConditionsScreen`
   - `PrivacyPolicyScreen`

---

## 📱 WHAT EACH SCREEN DOES:

### 1. Help & Support (SupportScreen)
- Quick contact buttons (Call, WhatsApp, Email)
- FAQ with 15+ questions
- Contact form to send messages
- Saves to Firebase `support_tickets` collection

### 2. File Complaint (ComplaintScreen)
- 7 complaint types
- Link to specific orders
- Track complaint status
- View complaint history
- Saves to Firebase `complaints` collection

### 3. Terms & Conditions (TermsAndConditionsScreen)
- 15 sections of legal terms
- User responsibilities
- Payment terms
- Dispute resolution
- Scrollable document

### 4. Privacy Policy (PrivacyPolicyScreen)
- 12 sections about data privacy
- What data is collected
- How data is used
- User rights
- Security measures

---

## 🎉 SUMMARY:

**Everything is working!** The buttons are in the Seller Profile screen, between "Edit Profile" and "Logout" buttons. Just:

1. Login as Seller
2. Go to Profile tab
3. Scroll down
4. Tap any of the 4 buttons

**If you still can't see them, restart the app with `npm start`**
