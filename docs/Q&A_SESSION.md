# Mentor Session Notes — Open Payments Donation Platform (Hackathon)

## 1. Project Context

The project involves building a **donation platform using Open Payments** during a hackathon.  
The goal is to demonstrate how **micro-donations can be integrated into everyday purchases** using Open Payments infrastructure.

Example concept:
- A user purchases something (e.g., at McDonald's).
- During checkout, the system asks if they want to **round up or donate a small amount**.
- The donation is processed through **Open Payments** and sent to a designated fund or beneficiary.

---

# 2. Assumptions for the Hackathon

To simplify the implementation, several assumptions can be made:

### User Accounts
You may assume that:
- Users already **have accounts and wallets set up**.
- Registration, identity verification, and document uploads are **already completed**.

Therefore:
- **No need to build onboarding flows**.
- Focus on the **payment and donation functionality**.

---

# 3. Types of Accounts in the System

The platform involves three types of participants:

1. **Donors**
   - Users who donate money.

2. **Collectors / Vendors**
   - Businesses (e.g., McDonald's) that collect donations during purchases.

3. **Recipients**
   - Organizations, families, or individuals receiving the funds.

These roles can all be represented through **wallet addresses in Open Payments**.

---

# 4. Core Platform Functionality

## 4.1 Donation During Purchase

Example flow:

1. User purchases a product or service.
2. Checkout offers a **donation option**.
3. User can:
   - Donate a fixed amount, or
   - **Round up the purchase amount**.

Example:
- Purchase: $4.70  
- Option: round up to $5.00  
- Donation: $0.30

This donation is sent through **Open Payments**.

---

## 4.2 User Confirmation

The donation must **not happen blindly**.

Before the payment executes, the user should see:

- The donation amount
- A permission prompt
- An approval action

Example confirmation:

> "Do you grant access to McDonald's to withdraw 10 cents from your account?"

User options:
- Accept
- Decline

---

# 5. Payment Infrastructure

## 5.1 Open Payments

Open Payments handles:
- Transactions
- Currency conversions
- Payment flows

Developers **do not need to implement these mechanisms manually**.

---

## 5.2 Currency Conversion

Open Payments automatically supports **multiple currencies**, including:

- USD
- EUR
- SGD
- CAD

Example:
- Donor wallet: USD
- Donation fund: EUR

The system automatically performs **currency conversion**.

---

## 5.3 Microtransactions

The platform supports **very small donations**, such as:

- A few cents
- Rounded purchase amounts

Potential rounding or precision issues are **already handled in Open Payments**.

---

# 6. Fees

Current behavior:

- **Test wallet to test wallet transactions have no fees**.

In real-world deployment:

- Banks or institutions integrating Open Payments may **add transaction fees**.

For the hackathon:
- **Ignore fee models**.

---

# 7. Platform Visibility

Users should be able to see:

- Their wallet balance
- Transaction history
- Donations made

This information is visible in the **test wallet interface**.

The platform itself **does not need to replicate the wallet system**.

---

# 8. Donation Governance

Funds can be distributed through several mechanisms.

Possible options:

### 1. Platform Decision
The platform determines where funds go.

### 2. Donor Voting
Donors vote on which cause receives the funds.

### 3. Disaster Response
When natural disasters occur:

- A vote or decision mechanism can allocate funds.

For the hackathon:
- You may implement **a simple voting or allocation mechanism**, or
- **Assume predefined destinations**.

---

# 9. Fraud Considerations

Real-world systems must address fraud, such as:

- People falsely claiming disaster assistance
- Misuse of funds

However:

- Full fraud prevention systems are **out of scope for the hackathon**.

Recommendation:
- Mention it briefly as **future work** in the presentation.

---

# 10. Transparency

Transparency is important for donor trust.

Possible UI features:

- Display the **total funds collected**
- Show **which disaster or cause is receiving the funds**

However:
- **Individual recipients should remain anonymous** to maintain privacy.

---

# 11. Possible Platform Features

## 11.1 Donation Dashboard

A dashboard could show:

- Active causes
- Total funds raised
- Donation progress

Similar to **GoFundMe-style tracking**, but without exposing recipient identities.

---

## 11.2 Disaster Cards

The platform could show **cause cards**, for example:

- Typhoon relief
- Flood recovery
- Emergency aid

These cards could be **generated dynamically** (possibly using AI).

---

## 11.3 Automatic Donations

Users could enable:

- **Automatic round-up donations**
- **Recurring micro-donations**

Example:

> Every purchase automatically rounds up to the nearest dollar.

---

# 12. Direct Payments vs Intermediaries

Two possible donation models:

### Model 1 — Through Organizations
Funds go to:
- NGOs
- Relief organizations

These organizations distribute funds.

### Model 2 — Direct to Wallets
Funds go **directly to recipient wallets**.

Advantages:
- Faster
- More transparent
- Fewer intermediaries

However:
- Requires recipients to have **Open Payments wallets**.

---

# 13. Minimum Technical Requirements (Mentor Expectations)

To score well in the hackathon, the following features are important.

---

## 13.1 Visible Transactions

After completing a payment:

- The transaction should appear in the **test wallet history**.

This proves the payment actually occurred.

---

## 13.2 Identity Provider (IDP) Authorization Flow

The proper Open Payments flow should include:

1. User initiates payment.
2. Redirect to **Identity Provider page** (Test Wallet).
3. User grants permission.
4. Redirect back to the platform.

Common mistake:
- Teams stop at the "Accepted" page without redirecting back.

Correct flow:

Platform → IDP Authorization → Permission Granted → Redirect back to Platform

Implementing the redirect correctly demonstrates **full understanding of the payment flow**.

---

## 13.3 Payment Methods

Some teams implement:

- QR code payments
- Wallet scanning

This is optional but adds polish.

---

# 14. Presentation Expectations

The final demo will be **5 minutes**.

Key elements:

### 1. Functional Demo
Show:
- Donation flow
- Payment execution
- Transaction verification

### 2. Good UI
A clean interface improves evaluation.

### 3. Backup Demo
Always prepare:

- A **recorded demo video**

Live demos can fail due to:
- Internet issues
- Platform errors

---

# 15. Development Strategy

Suggested workflow:

1. Implement **basic Open Payments flow**
2. Confirm transactions work
3. Add UI
4. Add donation logic
5. Polish the demo

Focus on **completing the core functionality first**, then refine the experience.

---

# 16. Key Takeaways

The hackathon project focuses on demonstrating:

- Open Payments integration
- Micro-donation systems
- Transparent fund distribution
- Simple user authorization flows

The most important success factors are:

- Working payment flow
- Visible transactions
- Proper authorization redirect
- Clear demo and presentation