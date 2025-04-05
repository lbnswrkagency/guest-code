const fs = require("fs");
const csv = require("csv-parse");
const path = require("path");

// Helper function to clean and normalize text
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[.,]/g, "") // Remove periods and commas
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};

// Helper function to categorize PayPal transactions
const categorizePayPal = (description) => {
  const desc = description.toLowerCase();
  if (desc.includes("4phones")) {
    return "4Phones.nl (PayPal)";
  }
  return "Other PayPal Transactions";
};

// Helper function to format amount
const formatAmount = (amount) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format amount with color indicators
const formatAmountWithIndicator = (amount) => {
  const formatted = formatAmount(amount);
  return `${formatted} ${amount >= 0 ? "📈" : "📉"}`;
};

// Helper function to truncate description
const truncateDescription = (desc, length = 40) => {
  return desc.length > length ? desc.substring(0, length) + "..." : desc;
};

// Helper function to print section header
const printHeader = (text) => {
  console.log("\n" + "═".repeat(60));
  console.log(" " + text);
  console.log("═".repeat(60));
};

// Helper function to print category summary
const printCategorySummary = (category, data, emoji = "📊") => {
  console.log(`\n${emoji} ${category}`);
  console.log(
    `  ${data.count
      .toString()
      .padStart(3)} transactions | Income: ${formatAmount(
      data.income
    )} | Expenses: ${formatAmount(data.expense)}`
  );
  console.log(`  Net: ${formatAmountWithIndicator(data.total)}`);

  if (data.examples && data.examples.length > 0) {
    console.log("  Examples:");
    data.examples.forEach((ex) => {
      const truncDesc = truncateDescription(ex.description);
      console.log(`    • ${ex.date}: ${truncDesc} (${ex.amount})`);
    });
  }
};

// Helper function to determine if transaction is income
const isIncome = (description, amount, type) => {
  const desc = normalizeText(description);

  // Explicit income indicators
  if (
    desc.includes("rechnung vom") ||
    desc.includes("eingang") ||
    desc.includes("gutschrift") ||
    desc.includes("bargeldein") ||
    desc.includes("sumup") ||
    desc.includes("verkauf") ||
    desc.includes("erstattung") ||
    desc.includes("rückzahlung")
  ) {
    return true;
  }

  // PayPal income only if explicitly a sale
  if (
    desc.includes("paypal") &&
    (desc.includes("verkauf") || desc.includes("zahlung von"))
  ) {
    return true;
  }

  // Phone sales are income
  if (
    (desc.includes("iphone") ||
      desc.includes("handy") ||
      desc.includes("smartphone")) &&
    (desc.includes("verkauf") || desc.includes("rechnung"))
  ) {
    return true;
  }

  // Direct debits and standing orders are usually expenses
  if (desc.includes("lastschrift") || desc.includes("dauerauftrag")) {
    return false;
  }

  return amount > 0;
};

// Helper function to categorize other transactions
const categorizeOther = (description, amount, type) => {
  const desc = normalizeText(description);

  // Commercial Property & Business
  if (
    desc.includes("hghi") ||
    desc.includes("leipziger platz") ||
    desc.includes("indexabrg") ||
    desc.includes("gewerbe") ||
    desc.includes("geschäftsmiete")
  ) {
    return "Commercial Property";
  }

  // Phone Sales & Repairs (Income)
  if (
    (desc.includes("iphone") ||
      desc.includes("handy") ||
      desc.includes("smartphone")) &&
    (desc.includes("verkauf") || desc.includes("rechnung"))
  ) {
    return "Phone Sales";
  }

  // Phone Purchases & Stock (Expense)
  if (
    (desc.includes("iphone") ||
      desc.includes("handy") ||
      desc.includes("smartphone")) &&
    (desc.includes("einkauf") || desc.includes("bestellung"))
  ) {
    return "Phone Stock Purchases";
  }

  // Rent & Property (residential)
  if (
    desc.includes("miete") ||
    desc.includes("wbm gmbh") ||
    desc.includes("kaution")
  ) {
    return "Rent & Property";
  }

  // Marketing & Advertising
  if (
    desc.includes("google") ||
    desc.includes("adwords") ||
    desc.includes("werbung") ||
    desc.includes("marketing")
  ) {
    return "Marketing & Advertising";
  }

  // Telecommunications
  if (
    desc.includes("telekom") ||
    desc.includes("vodafone") ||
    desc.includes("telefon") ||
    desc.includes("mobilfunk") ||
    desc.includes("internet")
  ) {
    return "Telecommunications";
  }

  // Taxes & Government
  if (
    desc.includes("finanzamt") ||
    desc.includes("steuer") ||
    desc.includes("gewerbe") ||
    desc.includes("umsatzsteuer") ||
    desc.includes("mehrwertsteuer")
  ) {
    return "Taxes & Government";
  }

  // Utilities
  if (
    desc.includes("getec") ||
    desc.includes("suewag") ||
    desc.includes("strom") ||
    desc.includes("wasser") ||
    desc.includes("heizung") ||
    desc.includes("energie")
  ) {
    return "Utilities";
  }

  // Software & Subscriptions
  if (
    desc.includes("spotify") ||
    desc.includes("adobe") ||
    desc.includes("microsoft") ||
    desc.includes("dropbox") ||
    desc.includes("abo") ||
    desc.includes("lizenz")
  ) {
    return "Software Subscriptions";
  }

  // Private Transfers
  if (
    desc.includes("privateinlage") ||
    desc.includes("privatentnahme") ||
    desc.includes("privat") ||
    desc.includes("überweisung privat")
  ) {
    return "Private Transfers";
  }

  // Salary & Wages
  if (
    desc.includes("lohn") ||
    desc.includes("gehalt") ||
    desc.includes("auszahlung") ||
    desc.includes("vergütung")
  ) {
    return "Salary & Wages";
  }

  // Bank Fees & Services
  if (
    desc.includes("kontoführung") ||
    desc.includes("rechnungsabschluss") ||
    desc.includes("gebühr") ||
    desc.includes("entgelt") ||
    desc.includes("provision")
  ) {
    return "Bank Fees & Services";
  }

  // Insurance
  if (
    desc.includes("versicherung") ||
    desc.includes("allianz") ||
    desc.includes("axa") ||
    desc.includes("police")
  ) {
    return "Insurance";
  }

  // Contracts & Leasing
  if (
    desc.includes("vertrag") ||
    desc.includes("leasing") ||
    desc.includes("sepa-basislastschrift") ||
    desc.includes("dauerauftrag")
  ) {
    return "Contracts & Leasing";
  }

  // Refunds & Returns
  if (
    desc.includes("erstattung") ||
    desc.includes("rückzahlung") ||
    desc.includes("gutschrift") ||
    desc.includes("retoure")
  ) {
    return "Refunds & Returns";
  }

  // Supplies & Office
  if (
    desc.includes("büro") ||
    desc.includes("material") ||
    desc.includes("bürobedarf") ||
    desc.includes("ausstattung")
  ) {
    return "Supplies & Office";
  }

  // Transportation
  if (
    desc.includes("bahn") ||
    desc.includes("taxi") ||
    desc.includes("uber") ||
    desc.includes("fahrt") ||
    desc.includes("reise")
  ) {
    return "Transportation";
  }

  // Analyze the transaction type
  if (type) {
    const transType = normalizeText(type);
    if (transType.includes("lastschrift")) {
      return "Direct Debits";
    }
    if (transType.includes("dauerauftrag")) {
      return "Standing Orders";
    }
    if (transType.includes("überweisung")) {
      return "Bank Transfers";
    }
  }

  // If we still can't categorize, check for common patterns
  if (
    desc.includes("gmbh") ||
    desc.includes("ag") ||
    desc.includes("ohg") ||
    desc.includes("kg")
  ) {
    return "Business Transactions";
  }

  return "Uncategorized";
};

// Main analysis function
async function analyzeTransactions() {
  const transactions = {};
  const paypalTransactions = {
    "4Phones.nl (PayPal)": { count: 0, total: 0, income: 0, expense: 0 },
    "Other PayPal Transactions": { count: 0, total: 0, income: 0, expense: 0 },
  };
  const otherTransactions = {};
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransactions = 0;
  let categorizedTransactions = 0;

  // Read and parse CSV file
  const parser = fs.createReadStream(path.join(__dirname, "xxxx.csv")).pipe(
    csv.parse({
      delimiter: ";",
      fromLine: 2,
      columns: [
        "date",
        "valueDate",
        "type",
        "description",
        "amount",
        "currency",
        "iban",
        "category",
      ],
    })
  );

  for await (const record of parser) {
    const amount = parseFloat(record.amount.replace(",", "."));
    const description = record.description;
    const isIncomeTransaction = isIncome(description, amount, record.type);

    if (isIncomeTransaction) {
      totalIncome += amount;
    } else {
      totalExpense += Math.abs(amount);
    }

    // Handle PayPal transactions separately
    if (description.includes("PayPal")) {
      const category = categorizePayPal(description);
      paypalTransactions[category].count++;
      paypalTransactions[category].total += amount;
      if (isIncomeTransaction) {
        paypalTransactions[category].income += amount;
      } else {
        paypalTransactions[category].expense += Math.abs(amount);
      }
      continue;
    }

    // Group similar transactions
    let key = "";
    const normalizedDesc = normalizeText(description);

    if (normalizedDesc.includes("sumup")) {
      key = "SumUp Payments";
    } else if (
      normalizedDesc.includes("house of mobile") ||
      normalizedDesc.includes("mobile and games")
    ) {
      key = "House of Mobile and Games";
    } else if (normalizedDesc.includes("bargeldein")) {
      key = "Cash Deposits";
    } else if (normalizedDesc.includes("otara")) {
      key = "Otara Transactions";
    } else if (normalizedDesc.includes("ebay")) {
      key = "eBay Transactions";
    } else {
      // Categorize other transactions
      const otherCategory = categorizeOther(description, amount, record.type);
      if (!otherTransactions[otherCategory]) {
        otherTransactions[otherCategory] = {
          count: 0,
          total: 0,
          income: 0,
          expense: 0,
          examples: [],
        };
      }
      otherTransactions[otherCategory].count++;
      otherTransactions[otherCategory].total += amount;
      if (isIncomeTransaction) {
        otherTransactions[otherCategory].income += amount;
      } else {
        otherTransactions[otherCategory].expense += Math.abs(amount);
      }
      if (otherTransactions[otherCategory].examples.length < 2) {
        otherTransactions[otherCategory].examples.push({
          description,
          amount: formatAmount(amount),
          date: record.date,
          type: isIncomeTransaction ? "Income" : "Expense",
        });
      }
      continue;
    }

    if (!transactions[key]) {
      transactions[key] = {
        count: 0,
        total: 0,
        income: 0,
        expense: 0,
        examples: [],
      };
    }

    transactions[key].count++;
    transactions[key].total += amount;
    if (isIncomeTransaction) {
      transactions[key].income += amount;
    } else {
      transactions[key].expense += Math.abs(amount);
    }

    if (transactions[key].examples.length < 2) {
      transactions[key].examples.push({
        description,
        amount: formatAmount(amount),
        date: record.date,
        type: isIncomeTransaction ? "Income" : "Expense",
      });
    }
  }

  // Print summary with updated formatting
  printHeader("Main Transaction Categories");

  // Regular transactions
  Object.entries(transactions)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .forEach(([category, data]) => {
      totalTransactions += data.count;
      categorizedTransactions += data.count;
      printCategorySummary(category, data, "💼");
    });

  // PayPal transactions
  printHeader("PayPal Transactions");
  Object.entries(paypalTransactions)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .forEach(([category, data]) => {
      totalTransactions += data.count;
      categorizedTransactions += data.count;
      printCategorySummary(category, data, "💳");
    });

  // Other transactions detail
  printHeader("Other Transactions Detail");

  let otherTotal = 0;
  let otherIncome = 0;
  let otherExpense = 0;
  let uncategorizedCount = 0;

  Object.entries(otherTransactions)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .forEach(([category, data]) => {
      totalTransactions += data.count;
      if (category !== "Uncategorized") {
        categorizedTransactions += data.count;
      } else {
        uncategorizedCount = data.count;
      }
      otherTotal += data.total;
      otherIncome += data.income;
      otherExpense += data.expense;
      printCategorySummary(
        category,
        data,
        category === "Uncategorized" ? "❓" : "🔍"
      );
    });

  // Final Summary
  printHeader("Financial Summary");

  // Transaction Statistics
  console.log("\n📊 Transaction Statistics:");
  console.log(`  Total Transactions:     ${totalTransactions}`);
  console.log(`  Categorized:            ${categorizedTransactions}`);
  console.log(`  Uncategorized:          ${uncategorizedCount}`);
  console.log(
    `  Categorization Rate:    ${(
      (categorizedTransactions / totalTransactions) *
      100
    ).toFixed(1)}%`
  );

  // Financial Overview
  console.log("\n💰 Financial Overview:");
  console.log(`  Total Income:           ${formatAmount(totalIncome)}`);
  console.log(`  Total Expenses:         ${formatAmount(totalExpense)}`);
  console.log("  " + "─".repeat(45));
  const balance = totalIncome - totalExpense;
  console.log(
    `  Net Balance:            ${formatAmountWithIndicator(balance)}`
  );

  // Monthly Averages
  const monthlyIncome = totalIncome / 12;
  const monthlyExpense = totalExpense / 12;
  const monthlyBalance = balance / 12;

  console.log("\n📅 Monthly Averages:");
  console.log(`  Average Income:         ${formatAmount(monthlyIncome)}`);
  console.log(`  Average Expenses:       ${formatAmount(monthlyExpense)}`);
  console.log("  " + "─".repeat(45));
  console.log(
    `  Average Balance:        ${formatAmountWithIndicator(monthlyBalance)}`
  );
}

// Run the analysis
console.log("📊 Starting transaction analysis...");
analyzeTransactions()
  .then(() => console.log("\n✅ Analysis complete!"))
  .catch((err) => console.error("❌ Error analyzing transactions:", err));
