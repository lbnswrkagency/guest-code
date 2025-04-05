const Order = require("./models/orderModel");
const Event = require("./models/eventsModel");
const TicketSettings = require("./models/ticketSettingsModel");
const Commission = require("./models/commissionModel");
const TransactionLedger = require("./models/transactionLedgerModel");
const RevenueSharing = require("./models/revenueSharingModel");
const { sendEmail } = require("./utils/sendEmail");
const vatRates = require("./utils/vatRates");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
// const { sendInvoice } = require("./sendInvoice");

// Function to generate invoice number from session ID
const generateInvoiceNumber = (sessionId) => {
  if (!sessionId) return "INV-0000";
  // Take the last 4 characters of the session ID
  const shortCode = sessionId.slice(-4).toUpperCase();
  return `INV-${shortCode}`;
};

const fulfillOrder = async (session, billingAddress) => {
  console.log("[FulfillOrder] Starting order fulfillment process");
  try {
    console.log("[FulfillOrder] Session metadata:", session.metadata);

    // Check if order already exists with this session ID - prevents race condition
    const existingOrder = await Order.findOne({ stripeSessionId: session.id });
    if (existingOrder) {
      console.log(
        "[FulfillOrder] Order already exists for session ID:",
        session.id
      );
      return existingOrder; // Return existing order, skip duplicate processing
    }

    // Parse the tickets from session metadata
    const tickets = JSON.parse(session.metadata.tickets || "[]");
    console.log("[FulfillOrder] Parsed tickets:", tickets);

    const eventId = session.metadata.eventId;
    console.log("[FulfillOrder] Event ID:", eventId);

    // Get event details including the brand and user (event creator)
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const brandId = event.brand?._id;
    // Get user ID from either the owner field or the first team member
    const userId =
      event.brand?.owner ||
      (event.brand?.team && event.brand.team.length > 0
        ? event.brand.team[0].user
        : null);

    if (!brandId || !userId) {
      console.warn(
        "[FulfillOrder] Warning: Brand ID or User ID not found for event:",
        {
          eventId,
          brandId: event.brand?._id,
          brandOwner: event.brand?.owner,
          teamUserFirst:
            event.brand?.team && event.brand.team.length > 0
              ? event.brand.team[0].user
              : undefined,
        }
      );
    }

    // Get customer email from session (try multiple possible locations)
    const email =
      session.metadata.email ||
      session.customer_email ||
      session.customer_details?.email ||
      "";
    console.log("[FulfillOrder] Customer email:", email);

    // Get customer name from session
    const firstName =
      session.metadata.firstName ||
      (session.customer_details?.name
        ? session.customer_details.name.split(" ")[0]
        : "");
    const lastName =
      session.metadata.lastName ||
      (session.customer_details?.name
        ? session.customer_details.name.split(" ").slice(1).join(" ")
        : "");
    console.log("[FulfillOrder] Customer name:", { firstName, lastName });

    if (!email) {
      console.error("[FulfillOrder] Missing customer email");
      throw new Error(
        "Customer email is required but was not found in the session data"
      );
    }

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(session.id);
    console.log("[FulfillOrder] Generated invoice number:", invoiceNumber);

    // Get currency information and exchange rate
    const originalCurrency = session.currency.toUpperCase(); // Should be "EUR"
    const originalAmount = session.amount_total / 100; // Original EUR amount

    // Get exchange rate from external API
    let conversionRate = null;
    let usdAmount = originalAmount; // Default if we can't get conversion
    let isEstimatedRate = true; // Default to true until we get a real rate

    try {
      console.log(
        "[FulfillOrder] Fetching real-time exchange rate from external API"
      );

      // Using a free, no-auth required API for exchange rates
      const response = await fetch(
        `https://open.er-api.com/v6/latest/${originalCurrency}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates.USD) {
          conversionRate = data.rates.USD;
          usdAmount = originalAmount * conversionRate;
          isEstimatedRate = false; // Using real rate from API

          console.log("[FulfillOrder] Retrieved real-time exchange rate:", {
            source: "open.er-api.com",
            originalCurrency,
            originalAmount,
            conversionRate,
            usdAmount,
            timestamp: data.time_last_update_utc,
          });
        } else {
          throw new Error("USD rate not found in API response");
        }
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (apiError) {
      console.error("[FulfillOrder] Error fetching exchange rate:", apiError);

      // Use fallback exchange rate
      conversionRate = 1.08; // Updated default as of 2024
      usdAmount = originalAmount * conversionRate;
      isEstimatedRate = true; // Using estimated fallback rate

      console.log("[FulfillOrder] Using fallback exchange rate:", {
        rate: conversionRate,
        originalAmount,
        usdAmount,
      });
    }

    // Get country code from billing address for VAT calculation
    const countryCode = billingAddress?.country || "";
    console.log(
      "[FulfillOrder] Customer country for VAT calculation:",
      countryCode
    );

    // Validate the country code - ensure it's properly formatted
    const validatedCountryCode = countryCode
      ? countryCode.trim().toUpperCase()
      : "";
    if (validatedCountryCode && validatedCountryCode.length !== 2) {
      console.warn(
        `[FulfillOrder] Invalid country code format: ${countryCode}`
      );
    }

    // Get applicable VAT rate for the customer's country
    const vatRate = vatRates.getVatRateForCountry(validatedCountryCode);
    console.log(
      `[FulfillOrder] Applied VAT rate for country ${validatedCountryCode}: ${vatRate}%`
    );

    // Additional check: log if country and VAT seem mismatched (e.g., DE with non-German VAT)
    if (validatedCountryCode === "DE" && vatRate !== 19) {
      console.warn(
        `[FulfillOrder] Possible VAT mismatch: Country is Germany but VAT is ${vatRate}%`
      );
    } else if (validatedCountryCode === "GR" && vatRate !== 24) {
      console.warn(
        `[FulfillOrder] Possible VAT mismatch: Country is Greece but VAT is ${vatRate}%`
      );
    }

    console.log("[FulfillOrder] Creating order in database...");
    // Create the order with both original and converted currency info
    const order = await Order.create({
      eventId,
      email,
      firstName,
      lastName,
      invoiceNumber,
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        name: ticket.name,
        quantity: ticket.quantity,
        pricePerUnit: ticket.price,
      })),
      originalCurrency,
      originalAmount,
      conversionRate,
      vatRate,
      totalAmount: usdAmount,
      stripeSessionId: session.id,
      billingAddress: {
        line1: billingAddress?.line1 || "",
        line2: billingAddress?.line2 || "",
        city: billingAddress?.city || "",
        state: billingAddress?.state || "",
        postal_code: billingAddress?.postal_code || "",
        country: countryCode,
      },
      status: "completed",
      paymentStatus: "paid",
      isEstimatedRate,
    });

    // Create transaction ledger entries for the order
    const createTransactionLedgerEntries = async (order, commission) => {
      try {
        console.log("[FulfillOrder] Creating transaction ledger entries");

        const transactionDate = new Date();
        const fiscalYear = transactionDate.getFullYear();
        const fiscalMonth = transactionDate.getMonth() + 1;
        const fiscalQuarter = Math.floor((fiscalMonth - 1) / 3) + 1;

        // 1. Record the sale - customer payment received
        const saleLedgerEntry = await TransactionLedger.create({
          transactionDate,
          transactionType: "sale",
          description: `Ticket sale for event ${order.eventId}`,
          debitAccount: "cash", // Money received
          creditAccount: "revenue", // Revenue recognized
          amount: order.totalAmount,
          currency: "USD",
          originalAmount: order.originalAmount,
          originalCurrency: order.originalCurrency,
          conversionRate: order.conversionRate,
          orderId: order._id,
          eventId: order.eventId,
          userId: order.userId,
          fiscalYear,
          fiscalQuarter,
          fiscalMonth,
          taxJurisdiction: order.billingAddress?.country,
          taxRate: order.vatRate / 100, // Convert percentage to decimal
          taxAmount:
            order.originalAmount -
            order.originalAmount / (1 + order.vatRate / 100),
          notes: `Invoice: ${order.invoiceNumber}, SessionID: ${order.stripeSessionId}`,
          createdBy: "system",
        });

        console.log(
          "[FulfillOrder] Created sale ledger entry:",
          saleLedgerEntry._id
        );

        // 2. Record the commission earned
        if (commission) {
          const commissionLedgerEntry = await TransactionLedger.create({
            transactionDate,
            transactionType: "commission",
            description: `Commission earned from ticket sale for event ${order.eventId}`,
            debitAccount: "revenue", // Reduces total revenue
            creditAccount: "accounts_payable", // We owe this to the event creator
            amount: commission.commissionAmount,
            currency: "USD",
            commissionId: commission._id,
            orderId: order._id,
            eventId: order.eventId,
            userId: commission.userId,
            fiscalYear,
            fiscalQuarter,
            fiscalMonth,
            taxJurisdiction: "US", // LLC is US-based
            taxRate: 0, // No tax on internal transfers
            notes: `Commission for order: ${order.invoiceNumber}, Rate: ${
              commission.commissionRate * 100
            }%`,
            createdBy: "system",
          });

          console.log(
            "[FulfillOrder] Created commission ledger entry:",
            commissionLedgerEntry._id
          );

          // Update commission with fiscal data
          await Commission.findByIdAndUpdate(commission._id, {
            fiscalYear,
            fiscalQuarter,
            taxJurisdiction: "US", // LLC is US-based
            taxLiability: commission.commissionAmount * 0.21, // Estimate 21% tax liability
          });
        }

        return true;
      } catch (ledgerError) {
        console.error(
          "[FulfillOrder] Error creating transaction ledger entries:",
          ledgerError
        );
        // Don't throw error, non-critical for order fulfillment
        return false;
      }
    };

    // Create commission record if we have brand and user info
    if (brandId && userId) {
      try {
        // Get commission rate from RevenueSharing model - no fallback defaults
        let commissionRate;

        // Try to find event-specific settings
        let revenueSharing = await RevenueSharing.findOne({
          eventId: eventId,
          isActive: true,
        });

        // If no event-specific settings, try brand-specific settings
        if (!revenueSharing) {
          revenueSharing = await RevenueSharing.findOne({
            brandId: brandId,
            isActive: true,
          });
        }

        // If still no settings, use global default
        if (!revenueSharing) {
          revenueSharing = await RevenueSharing.findOne({
            eventId: null,
            brandId: null,
            isActive: true,
          });
        }

        // Ensure we have revenue sharing settings
        if (!revenueSharing) {
          console.error(
            "[FulfillOrder] No active revenue sharing settings found. Commission cannot be calculated."
          );
          throw new Error(
            "Revenue sharing settings not found. Please set up commission rates in the database."
          );
        }

        // Set commission rate from revenue sharing record
        commissionRate = revenueSharing.platformCommissionRate / 100; // Convert from percentage to decimal
        console.log(
          `[FulfillOrder] Using commission rate from settings: ${
            commissionRate * 100
          }%`
        );

        // Calculate commission amount
        const commissionAmount = usdAmount * commissionRate;

        console.log("[FulfillOrder] Creating commission record with:", {
          brandId,
          userId,
          eventId,
          isGuestPurchase: !session.metadata.userId,
          orderAmount: usdAmount,
          rate: commissionRate,
          commissionAmount: commissionAmount,
        });

        const commission = await Commission.create({
          orderId: order._id,
          eventId,
          brandId,
          userId,
          isGuestPurchase: !session.metadata.userId,
          orderAmount: usdAmount, // Use USD amount for commission
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          status: "pending",
        });

        // Update order with commission reference
        await Order.findByIdAndUpdate(order._id, {
          commissionId: commission._id,
        });

        console.log("[FulfillOrder] Commission record created successfully:", {
          commissionId: commission._id,
          amount: commission.commissionAmount,
          currency: "USD",
          status: commission.status,
          isGuestPurchase: commission.isGuestPurchase,
        });

        // Create transaction ledger entries
        await createTransactionLedgerEntries(order, commission);
      } catch (commissionError) {
        console.error(
          "[FulfillOrder] Error creating commission record:",
          commissionError,
          {
            error: commissionError.message,
            stack: commissionError.stack,
            code: commissionError.code,
            brandId,
            userId,
            orderId: order._id,
          }
        );
        // Don't throw error, as we still want to complete the order
      }
    } else {
      console.log(
        "[FulfillOrder] Skipping commission creation - missing brand or user info:",
        {
          brandId: brandId || "Missing",
          userId: userId || "Missing",
        }
      );

      // Still create transaction ledger entries even without commission
      await createTransactionLedgerEntries(order, null);
    }

    console.log("[FulfillOrder] Updating ticket counts in TicketSettings...");
    // Update ticket counts in TicketSettings
    for (const ticket of tickets) {
      console.log(
        `[FulfillOrder] Processing ticket: ${ticket.name} (${ticket.ticketId})`
      );
      try {
        // Find the ticket settings and increment the soldCount
        const updatedTicket = await TicketSettings.findByIdAndUpdate(
          ticket.ticketId,
          { $inc: { soldCount: ticket.quantity } },
          { new: true }
        );

        console.log(
          `[FulfillOrder] Updated soldCount for ticket ${ticket.name} (${
            ticket.ticketId
          }), sold ${ticket.quantity} tickets. New total: ${
            updatedTicket?.soldCount || "unknown"
          }`
        );
      } catch (ticketError) {
        console.error(
          `[FulfillOrder] Error updating ticket ${ticket.ticketId}:`,
          ticketError
        );
      }
    }

    // Send confirmation email
    console.log("[FulfillOrder] Sending confirmation email to customer...");
    try {
      await sendEmail(order);
      console.log("[FulfillOrder] Confirmation email sent successfully");
    } catch (emailError) {
      console.error(
        "[FulfillOrder] Error sending confirmation email:",
        emailError
      );
      // Don't throw here, we want to continue even if email fails
    }

    console.log("[FulfillOrder] Order fulfillment completed successfully");
    return order;
  } catch (error) {
    console.error("[FulfillOrder] Critical error during order fulfillment:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
};

module.exports = {
  fulfillOrder,
};
