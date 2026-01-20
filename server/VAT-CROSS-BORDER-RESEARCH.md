# VAT & Receipts for Cross-Border Event Ticket Sales

## Research Summary for AI Context

This document summarizes research conducted on how a Greek company (E.E.) can legally sell event tickets in Germany while complying with EU VAT rules and Greek AADE/myDATA requirements.

---

## The Problem Statement

**Company**: LBNSWRK E.E. (Greek partnership)
- VAT: 803058973
- Tax Office: ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ
- Γ.Ε.ΜΗ.: 188401803000

**Current Setup**:
- Sells tickets for events in Greece
- Issues receipts via Accounty API → AADE myDATA
- Receipts include 24% Greek VAT and AADE MARK (QR code)

**New Requirement**:
- Expand to host events in Germany
- Need to understand: What VAT? What receipt format? Does AADE still apply?

---

## Questions We Explored

### Question 1: What VAT rate applies for German events?
**Answer**: 19% German VAT (not Greek 24%)

**Why**: EU VAT Directive Article 54 states that for B2C admission to events, VAT is charged **where the event takes place**, not where the company is located.

### Question 2: Does reverse charge (0% VAT) apply?
**Answer**: NO - Reverse charge only applies to B2B transactions.

Since LBNSWRK is:
- The event organizer (not just a platform)
- Selling directly to consumers (B2C)
- The merchant of record

...reverse charge does NOT apply. VAT must be charged.

### Question 3: Does the AADE API / myDATA still apply for German sales?
**Answer**: YES - but with different invoice types and classifications.

Greek companies must still report to myDATA, but:
- Different invoice type codes
- Different income classification codes
- NO AADE MARK for non-Greek sales

### Question 4: What is OSS (One-Stop-Shop)?
**Answer**: EU system allowing companies to report cross-border VAT through their home country.

Instead of registering for VAT in every EU country, you:
1. Register for OSS in Greece (with AADE)
2. Charge destination country VAT (e.g., 19% for Germany)
3. Report quarterly to AADE
4. AADE forwards the VAT to the destination country

### Question 5: Is there a threshold?
**Answer**: YES - €10,000/year

| Annual EU Cross-Border B2C Sales | Requirement |
|----------------------------------|-------------|
| Under €10,000 | Can charge Greek 24% VAT (simpler) |
| Over €10,000 | MUST charge destination country VAT via OSS |

---

## AADE myDATA API Technical Details

### Invoice Types (Τύποι Παραστατικών)

| Code | Greek Name | English | Use Case |
|------|------------|---------|----------|
| 1.1 | Τιμολόγιο Πώλησης | Sales Invoice | B2B goods |
| 1.2 | Τιμολόγιο Πώλησης / Ενδοκοινοτικές Παραδόσεις | Sales Invoice / Intra-community Deliveries | B2B goods to EU |
| 2.1 | Τιμολόγιο Παροχής | Service Invoice | B2B services |
| 2.2 | Τιμολόγιο Παροχής / Ενδοκοινοτική Παροχή Υπηρεσιών | Service Invoice / Intra-community Services | B2B services to EU |
| 2.3 | Τιμολόγιο Παροχής / Τρίτες Χώρες | Service Invoice / Third Countries | Services outside EU |
| 11.1 | ΑΛΠ | Retail Sales Receipt | B2C domestic |
| 11.2 | ΑΠΥ | Service Provision Receipt | B2C services |
| 11.3 | Απλοποιημένο Τιμολόγιο | Simplified Invoice | B2C cross-border (OSS) |
| 11.4 | Πιστωτικό Στοιχείο Λιανικής | Retail Credit Note | Refunds |

### Income Classification Codes (Χαρακτηρισμοί Εσόδων)

| Code | Description | Use Case |
|------|-------------|----------|
| E3_561_001 | Πωλήσεις Χονδρικές - Επιτηδευματιών | B2B wholesale |
| E3_561_003 | Πωλήσεις Λιανικές - Ιδιωτική Πελατεία | B2C domestic retail |
| E3_561_005 | Πωλήσεις Εξωτερικού Ενδοκοινοτικές | Intra-community sales (EU) |
| E3_561_006 | Πωλήσεις Εξωτερικού Τρίτες Χώρες | Third country sales |

### VAT Categories (Κατηγορίες ΦΠΑ)

| Category | Rate | Description |
|----------|------|-------------|
| 1 | 24% | Standard Greek VAT |
| 2 | 13% | Reduced rate |
| 3 | 6% | Super reduced |
| 4 | 17% | Island reduced |
| 5 | 9% | Island reduced |
| 6 | 4% | Island super reduced |
| 7 | 0% | Zero rate (with exemption) |
| 8 | N/A | Without VAT (not applicable) |

### VAT Exemption Categories (For 0% VAT)

When using VAT category 7 (0%), you must specify an exemption reason:

| Code | Article | Description |
|------|---------|-------------|
| 1 | Article 2 | Outside scope |
| 2 | Article 3 | VAT Code exemption |
| 3 | Article 14 | Intra-community services (reverse charge) |
| 4 | Article 22 | Export exemption |
| ... | ... | ... |

---

## Comparison: Greek vs German Event Sales

### For Greek Events (Current)

```
Customer buys €40 ticket
         ↓
Accounty API called with:
- invoiceType: "11.1" (ΑΛΠ)
- incomeClassification: "E3_561_003"
- vatCategory: "1" (24%)
- netAmount: €32.26
- vatAmount: €7.74
         ↓
AADE myDATA returns:
- MARK: 400012176612155
- QR Code for verification
         ↓
Receipt PDF generated with MARK
```

### For German Events (OSS - Over €10k)

```
Customer buys €40 ticket
         ↓
Accounty API called with:
- invoiceType: "11.3" (Simplified Invoice)
- incomeClassification: "E3_561_005"
- vatCategory: "7" (0% with exemption)
- vatExemptionCategory: (OSS specific)
- eventCountry: "DE"
- foreignVatRate: 19
- netAmount: €33.61
- foreignVatAmount: €6.39
         ↓
AADE myDATA returns:
- NO MARK (not required for EU sales)
- Logged for OSS reporting
         ↓
EU Invoice PDF generated (no MARK)
         ↓
Quarterly: Report to OSS portal
```

---

## Current Code Architecture

### Where receipts are generated

```
server/fulfillOrder.js
├── createAadeReceipt() - calls Accounty API
│   ├── Builds receipt payload
│   ├── Currently hardcodes vatCategory: "1" (24%)
│   ├── Sends to ACCOUNTY_API_URL/external/receipts
│   └── Returns: mark, qrCode, receiptNumber
│
└── fulfillOrder() - main function
    ├── Creates Order in database
    ├── Calls createAadeReceipt()
    ├── Updates Order with receipt info
    └── Sends email to customer
```

### Current hardcoded values (need to change)

```javascript
// server/fulfillOrder.js line 47-49
unitPrice: parseFloat((ticket.pricePerUnit / 1.24).toFixed(2)),
vatCategory: "1", // 24% VAT - HARDCODED!

// server/fulfillOrder.js line 197-199
// VAT rate - default to Greek 24%
// TODO: When event.country field is added, use that instead
const vatRate = 24; // HARDCODED!
```

### Event model (missing country field)

```javascript
// server/models/eventsModel.js
// Currently has: city, location, street, postalCode
// Missing: country field
```

---

## Implementation Plan

### Phase 1: Add Country to Events

**File**: `server/models/eventsModel.js`

```javascript
country: {
  type: String,
  enum: ['EL', 'DE', 'AT', 'NL', 'FR', 'IT', 'ES'],
  default: 'EL'
}
```

### Phase 2: Add Country Selector UI

**File**: `client/src/Components/TicketCodeSettings/TicketCodeSettings.js`

Add in `renderGlobalSettings()` function, next to Payment Methods:

```jsx
<div className="country-selector">
  <label>Event Country (for VAT & receipts)</label>
  <div className="country-options">
    <div className={`country-option ${eventCountry === 'EL' ? 'selected' : ''}`}>
      <span>🇬🇷 Greece (EL)</span>
      <small>24% VAT - AADE Receipt with MARK</small>
    </div>
    <div className={`country-option ${eventCountry === 'DE' ? 'selected' : ''}`}>
      <span>🇩🇪 Germany (DE)</span>
      <small>19% VAT - EU Invoice (OSS)</small>
    </div>
  </div>
</div>
```

### Phase 3: Update fulfillOrder.js

```javascript
// Get VAT config based on event country
const getVatConfig = (country) => {
  const configs = {
    'EL': { rate: 24, divisor: 1.24, category: '1', needsMark: true },
    'DE': { rate: 19, divisor: 1.19, category: '7', needsMark: false },
    'AT': { rate: 20, divisor: 1.20, category: '7', needsMark: false },
    'NL': { rate: 21, divisor: 1.21, category: '7', needsMark: false },
  };
  return configs[country] || configs['EL'];
};

// In createAadeReceipt():
const vatConfig = getVatConfig(event.country || 'EL');

const receiptData = {
  // ... existing fields
  eventCountry: event.country || 'EL',
  items: order.tickets.map((ticket) => ({
    description: `${ticket.name} - ${event.title}`,
    quantity: ticket.quantity,
    unitPrice: parseFloat((ticket.pricePerUnit / vatConfig.divisor).toFixed(2)),
    vatCategory: vatConfig.category,
    vatRate: vatConfig.rate,
  })),
};
```

### Phase 4: Update Accounty API

Accounty needs to:

1. Accept `eventCountry` parameter
2. Determine invoice type based on country:
   - EL → Type 11.1, request MARK
   - Other EU → Type 11.3, skip MARK
3. Use correct income classification:
   - EL → E3_561_003
   - Other EU → E3_561_005
4. Generate appropriate PDF format

---

## EU VAT Rates Reference (2024)

| Country | Code | Standard | Reduced | Super Reduced |
|---------|------|----------|---------|---------------|
| Greece | EL | 24% | 13% | 6% |
| Germany | DE | 19% | 7% | - |
| Austria | AT | 20% | 10/13% | - |
| Netherlands | NL | 21% | 9% | - |
| France | FR | 20% | 5.5/10% | 2.1% |
| Italy | IT | 22% | 5/10% | 4% |
| Spain | ES | 21% | 10% | 4% |
| Belgium | BE | 21% | 6/12% | - |
| Portugal | PT | 23% | 6/13% | - |

---

## OSS Registration Process

1. **Portal**: https://www1.aade.gr/gsisapps5/oss/
2. **Requirements**: Valid Greek VAT number, TAXISnet credentials
3. **Timeline**: Registration effective from first day of next quarter
4. **Reporting**: Quarterly returns due by end of month after quarter
5. **Payment**: Pay all EU VAT to AADE, they distribute to member states

---

## Key Sources Used in Research

### Official AADE Documentation
- [AADE OSS Portal](https://www.aade.gr/en/oss)
- [myDATA Technical Specifications](https://www.aade.gr/en/mydata/technical-specifications-versions-mydata)
- [myDATA API Documentation v1.0.8](https://www.aade.gr/sites/default/files/2023-12/myDATA%20API%20Documentation%20v1.0.8_preofficial_erp.pdf)

### EU Commission
- [EU VAT Place of Supply Rules](https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/place-taxation_en)
- [Your Europe - VAT Rules](https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_el.htm)

### Greek Resources
- [InvoiceMaker myDATA Docs](https://docs.invoicemaker.gr/appendix/invoice-types)
- [TaxHeaven - myDATA Guide](https://www.taxheaven.gr/qna/my-data/)
- [Epsilon Net - myDATA FAQ](https://kb.epsilonnet.gr/ld/category/mydata/)

### Third-Party Analysis
- [Lexology - VAT Treatment of Online Events](https://www.lexology.com/library/detail.aspx?g=799afa52-a646-4f51-b880-6e20db113b40)
- [Stripe - Reverse Charge Germany](https://stripe.com/resources/more/reverse-charge-vat-germany)

---

## Decision Summary

### If German sales < €10,000/year
- **No changes needed**
- Keep charging 24% Greek VAT
- Keep issuing Greek receipts with MARK
- Simplest option

### If German sales > €10,000/year (or expected to grow)
1. Register for OSS with AADE
2. Add `country` field to Event model
3. Add country selector in TicketCodeSettings
4. Update fulfillOrder.js to pass country
5. Modify Accounty for multi-country receipts
6. File quarterly OSS returns

---

## Important Notes for Implementation

1. **Greece uses "EL" not "GR"** in EU VAT context
2. **myDATA submission is still required** for EU sales, just different codes
3. **No AADE MARK** for non-Greek receipts
4. **OSS is quarterly**, not per-transaction
5. **Verify with logistis** before going live - tax rules can change
