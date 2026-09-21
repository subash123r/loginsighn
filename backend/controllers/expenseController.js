import Expense from "../models/Expense.js";
import Tesseract from "tesseract.js";

// =====================================================
// PAYMENT METHODS
// =====================================================

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other",
];

const normalizePaymentMethod = (value) => {
  return PAYMENT_METHODS.includes(value)
    ? value
    : "Other";
};

// =====================================================
// HELPER - CLEAN TEXT
// =====================================================

const cleanOCRText = (text = "") => {
  return String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[ ]+/g, " ")
    .trim();
};

// =====================================================
// HELPER - GET LINES
// =====================================================

const getLines = (text = "") => {
  return text
    .split("\n")
    .map((line) =>
      line.replace(/\s+/g, " ").trim()
    )
    .filter((line) => line.length > 1);
};

// =====================================================
// HELPER - OCR NUMBER CLEANING
// =====================================================

const fixOCRNumber = (value = "") => {
  let text = String(value)
    .trim()
    .replace(/[₹$€£]/g, "")
    .replace(
      /\b(?:rs|rs\.|inr|usd|aud)\b/gi,
      ""
    )
    .replace(/,/g, "")
    .replace(/\s/g, "");

  text = text
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8");

  text = text.replace(/[^\d.]/g, "");

  const dotParts = text.split(".");

  if (dotParts.length > 2) {
    text =
      dotParts.slice(0, -1).join("") +
      "." +
      dotParts[dotParts.length - 1];
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? number
    : 0;
};

// =====================================================
// DATE EXTRACTION
// =====================================================

const extractDate = (text) => {
  if (!text) return "";

  let match;

  // DD/MM/YYYY
  match = text.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
  );

  if (match) {
    return `${match[3]}-${match[2].padStart(
      2,
      "0"
    )}-${match[1].padStart(2, "0")}`;
  }

  // DD-MM-YYYY
  match = text.match(
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/
  );

  if (match) {
    return `${match[3]}-${match[2].padStart(
      2,
      "0"
    )}-${match[1].padStart(2, "0")}`;
  }

  // DD.MM.YYYY
  match = text.match(
    /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/
  );

  if (match) {
    return `${match[3]}-${match[2].padStart(
      2,
      "0"
    )}-${match[1].padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  match = text.match(
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/
  );

  if (match) {
    return `${match[1]}-${match[2].padStart(
      2,
      "0"
    )}-${match[3].padStart(2, "0")}`;
  }

  // YYYY/MM/DD
  match = text.match(
    /\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/
  );

  if (match) {
    return `${match[1]}-${match[2].padStart(
      2,
      "0"
    )}-${match[3].padStart(2, "0")}`;
  }

  // DD/MM/YY
  match = text.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/
  );

  if (match) {
    return `20${match[3]}-${match[2].padStart(
      2,
      "0"
    )}-${match[1].padStart(2, "0")}`;
  }

  // Date after label
  match = text.match(
    /(?:date|invoice date|bill date|issue date|issued on)\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
  );

  if (match) {
    const parts = match[1].split(
      /[\/.-]/
    );

    if (parts.length === 3) {
      let [day, month, year] =
        parts;

      if (year.length === 2) {
        year = `20${year}`;
      }

      return `${year}-${month.padStart(
        2,
        "0"
      )}-${day.padStart(2, "0")}`;
    }
  }

  return "";
};

// =====================================================
// AMOUNT EXTRACTION
// =====================================================

const extractAmount = (
  text,
  lines
) => {
  console.log(
    "========== AMOUNT EXTRACTION =========="
  );

  const totalPatterns = [
    /grand\s*total\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /total\s*amount\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /amount\s*due\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /total\s*due\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /net\s*total\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /total\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,

    /t[o0]tal\s*[:\-]?\s*(?:₹|rs\.?|inr|\$|usd|aud)?\s*([0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?)/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(
      pattern
    );

    if (match) {
      const amount = fixOCRNumber(
        match[1]
      );

      console.log(
        "TOTAL MATCH:",
        match[0],
        "=>",
        amount
      );

      if (amount > 0) {
        return amount;
      }
    }
  }

  // Check every line containing total

  for (const line of lines) {
    if (
      /total|amount due|grand|net amount|payable/i.test(
        line
      )
    ) {
      console.log(
        "TOTAL LINE:",
        line
      );

      const numberMatches =
        line.match(
          /[0-9OoIlSBs]+(?:[,.][0-9OoIlSBs]+)*/g
        );

      if (numberMatches) {
        const values =
          numberMatches
            .map((value) =>
              fixOCRNumber(value)
            )
            .filter(
              (value) => value > 0
            );

        if (values.length > 0) {
          return values[
            values.length - 1
          ];
        }
      }
    }
  }

  // Currency based detection

  const currencyRegex =
    /(?:₹|rs\.?|inr|\$|usd|aud)\s*[0-9OoIlSBs,]+(?:\.[0-9OoIlSBs]{1,2})?/gi;

  const currencyMatches =
    text.match(currencyRegex);

  if (currencyMatches) {
    const values =
      currencyMatches
        .map((value) =>
          fixOCRNumber(value)
        )
        .filter(
          (value) => value > 0
        );

    if (values.length > 0) {
      return Math.max(
        ...values
      );
    }
  }

  // Last fallback

  const allNumbers = [];

  for (const line of lines) {
    const matches =
      line.match(
        /\b[0-9OoIlSBs]+(?:[,][0-9OoIlSBs]{3})*(?:\.[0-9OoIlSBs]{1,2})?\b/g
      );

    if (matches) {
      for (const value of matches) {
        const number =
          fixOCRNumber(value);

        if (
          number > 0 &&
          number < 100000000
        ) {
          allNumbers.push(
            number
          );
        }
      }
    }
  }

  if (allNumbers.length > 0) {
    return Math.max(
      ...allNumbers
    );
  }

  return 0;
};

// =====================================================
// VENDOR EXTRACTION
// =====================================================

const extractVendor = (lines) => {
  for (const line of lines) {
    const match = line.match(
      /(?:vendor|store|shop|merchant|seller|company)\s*[:\-]\s*(.+)/i
    );

    if (match) {
      return match[1].trim();
    }
  }

  const ignoredPatterns = [
    /invoice/i,
    /receipt/i,
    /bill/i,
    /tax/i,
    /gst/i,
    /date/i,
    /amount/i,
    /total/i,
    /subtotal/i,
    /quantity/i,
    /qty/i,
    /description/i,
    /price/i,
    /phone/i,
    /mobile/i,
    /email/i,
    /www\./i,
    /http/i,
    /cash/i,
    /upi/i,
    /thank/i,
  ];

  for (const line of lines.slice(
    0,
    10
  )) {
    if (line.length < 3)
      continue;

    if (
      ignoredPatterns.some(
        (pattern) =>
          pattern.test(line)
      )
    ) {
      continue;
    }

    if (!/[a-zA-Z]/.test(line))
      continue;

    const digitCount =
      (line.match(/\d/g) || [])
        .length;

    if (
      digitCount >
      line.length * 0.5
    ) {
      continue;
    }

    return line;
  }

  return "";
};

// =====================================================
// ITEM NAME
// =====================================================

const extractItemName = (
  lines,
  vendor
) => {
  for (const line of lines) {
    const match = line.match(
      /(?:item|item name|product|product name|description|service)\s*[:\-]\s*(.+)/i
    );

    if (match) {
      const item = match[1]
        .replace(
          /\s+\d+\s+(?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?/gi,
          ""
        )
        .trim();

      if (item.length > 2) {
        return item;
      }
    }
  }

  const ignored = [
    /invoice/i,
    /receipt/i,
    /tax invoice/i,
    /date/i,
    /gst/i,
    /gstin/i,
    /phone/i,
    /mobile/i,
    /email/i,
    /www\./i,
    /description/i,
    /quantity/i,
    /qty/i,
    /unit price/i,
    /subtotal/i,
    /total/i,
    /grand total/i,
    /amount due/i,
    /cash/i,
    /upi/i,
    /thank/i,
  ];

  for (const line of lines) {
    if (line.length < 3)
      continue;

    if (
      vendor &&
      line === vendor
    ) {
      continue;
    }

    if (
      ignored.some(
        (pattern) =>
          pattern.test(line)
      )
    ) {
      continue;
    }

    if (!/[a-zA-Z]/.test(line))
      continue;

    let cleaned = line
      .replace(
        /\s+\d+\s+(?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?\s+(?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?\s*$/i,
        ""
      )
      .trim();

    cleaned = cleaned
      .replace(
        /\s+(?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\.\d{1,2})?\s*$/i,
        ""
      )
      .trim();

    if (cleaned.length > 2) {
      return cleaned;
    }
  }

  return "Receipt Expense";
};

// =====================================================
// QUANTITY
// =====================================================

const extractQuantity = (
  text
) => {
  const patterns = [
    /(?:quantity|qty|units?)\s*[:\-]?\s*(\d+)/i,
    /(?:quantity|qty|units?)\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match) {
      const quantity =
        Number(match[1]);

      if (
        Number.isFinite(
          quantity
        ) &&
        quantity >= 1
      ) {
        return quantity;
      }
    }
  }

  return 1;
};

// =====================================================
// CATEGORY
// =====================================================

const extractCategory = (
  text,
  itemName,
  vendor
) => {
  const value =
    `${text} ${itemName} ${vendor}`
      .toLowerCase();

  if (
    /restaurant|grocery|supermarket|food|lunch|dinner|breakfast|meal|cafe|bakery|swiggy|zomato/.test(
      value
    )
  ) {
    return "Food";
  }

  if (
    /uber|ola|taxi|bus|train|flight|fuel|petrol|diesel|transport|parking|toll/.test(
      value
    )
  ) {
    return "Travel";
  }

  if (
    /hospital|clinic|medicine|pharmacy|medical|doctor|health/.test(
      value
    )
  ) {
    return "Health";
  }

  if (
    /school|college|education|course|tuition|book|books|stationery/.test(
      value
    )
  ) {
    return "Education";
  }

  if (
    /electricity|water bill|internet bill|mobile bill|utility|recharge|airtel|jio|vi/.test(
      value
    )
  ) {
    return "Bills";
  }

  if (
    /movie|cinema|game|gaming|entertainment|netflix|spotify/.test(
      value
    )
  ) {
    return "Entertainment";
  }

  if (
    /shopping|clothes|fashion|mall|amazon|flipkart|myntra|shirt|pant|shoe/.test(
      value
    )
  ) {
    return "Shopping";
  }

  return "Other";
};

// =====================================================
// NOTES
// =====================================================

const extractNotes = (
  text
) => {
  const lines =
    getLines(text);

  const notes =
    lines.filter((line) =>
      /thank you|thankyou|visit again|cashier|counter|payment|upi|cash|card|change|balance/i.test(
        line
      )
    );

  return notes
    .slice(0, 3)
    .join(" ");
};

// =====================================================
// CREATE EXPENSE
// =====================================================

export const createExpense =
  async (req, res) => {
    try {
      const {
        date,
        itemName,
        amount,
        quantity,
        category,
        vendor,
        paymentMethod,
        receiptImage,
        notes,
      } = req.body;

      if (
        !date ||
        !itemName ||
        amount === undefined
      ) {
        return res.status(400).json({
          message:
            "Date, item name and amount are required",
        });
      }

      const expenseDate =
        new Date(date);

      if (
        isNaN(
          expenseDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid date",
        });
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Amount must be greater than 0",
        });
      }

      const numericQuantity =
        Number(quantity || 1);

      if (
        !Number.isFinite(
          numericQuantity
        ) ||
        numericQuantity < 1
      ) {
        return res.status(400).json({
          message:
            "Quantity must be at least 1",
        });
      }

      const month =
        `${expenseDate.getFullYear()}-${String(
          expenseDate.getMonth() + 1
        ).padStart(2, "0")}`;

      const normalizedPaymentMethod =
        normalizePaymentMethod(
          paymentMethod
        );

      const expense =
        await Expense.create({
          userId: req.userId,
          date: expenseDate,
          month,
          itemName: itemName.trim(),
          amount: numericAmount,
          quantity: numericQuantity,
          category:
            category || "Other",
          vendor: vendor || "",
          paymentMethod:
            normalizedPaymentMethod,
          receiptImage:
            receiptImage || "",
          notes: notes || "",
        });

      console.log(
        "========== EXPENSE CREATED =========="
      );

      console.log({
        itemName:
          expense.itemName,
        amount:
          expense.amount,
        quantity:
          expense.quantity,
        category:
          expense.category,
        vendor:
          expense.vendor,
        paymentMethod:
          expense.paymentMethod,
        month:
          expense.month,
      });

      return res.status(201).json({
        message:
          "Expense added successfully",
        expense,
      });
    } catch (error) {
      console.log(
        "CREATE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to add expense",
        error:
          error.message,
      });
    }
  };

// =====================================================
// GET EXPENSES
// =====================================================

export const getExpenses =
  async (req, res) => {
    try {
      const { month } =
        req.query;

      const filter = {
        userId: req.userId,
      };

      if (month) {
        filter.month = month;
      }

      const expenses =
        await Expense.find(
          filter
        ).sort({
          date: -1,
        });

      return res
        .status(200)
        .json(expenses);
    } catch (error) {
      console.log(
        "GET EXPENSES ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get expenses",
        error:
          error.message,
      });
    }
  };

// =====================================================
// GET SINGLE EXPENSE
// =====================================================

export const getExpenseById =
  async (req, res) => {
    try {
      const expense =
        await Expense.findOne({
          _id: req.params.id,
          userId: req.userId,
        });

      if (!expense) {
        return res.status(404).json({
          message:
            "Expense not found",
        });
      }

      return res
        .status(200)
        .json(expense);
    } catch (error) {
      console.log(
        "GET EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get expense",
        error:
          error.message,
      });
    }
  };

// =====================================================
// DELETE EXPENSE
// =====================================================

export const deleteExpense =
  async (req, res) => {
    try {
      const expense =
        await Expense.findOneAndDelete(
          {
            _id: req.params.id,
            userId: req.userId,
          }
        );

      if (!expense) {
        return res.status(404).json({
          message:
            "Expense not found",
        });
      }

      return res.status(200).json({
        message:
          "Expense deleted successfully",
      });
    } catch (error) {
      console.log(
        "DELETE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete expense",
        error:
          error.message,
      });
    }
  };

// =====================================================
// SCAN RECEIPT - OCR
// =====================================================

export const scanReceipt =
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "Please upload a receipt image",
        });
      }

      console.log(
        "================================="
      );

      console.log(
        "SCANNING RECEIPT"
      );

      console.log(
        "FILE:",
        req.file.path
      );

      console.log(
        "================================="
      );

      const result =
        await Tesseract.recognize(
          req.file.path,
          "eng",
          {
            logger: (info) => {
              if (
                info.status ===
                "recognizing text"
              ) {
                console.log(
                  `OCR Progress: ${Math.round(
                    (info.progress ||
                      0) * 100
                  )}%`
                );
              }
            },
          }
        );

      const text =
        result?.data?.text ||
        "";

      console.log(
        "========== RAW OCR TEXT =========="
      );

      console.log(
        JSON.stringify(text)
      );

      console.log(
        "=================================="
      );

      if (!text.trim()) {
        return res.status(400).json({
          message:
            "Could not read text from receipt. Please upload a clearer image.",

          extractedData: {
            date: "",
            itemName:
              "Receipt Expense",
            amount: 0,
            quantity: 1,
            vendor: "",
            category: "Other",
            paymentMethod:
              "Other",
            notes: "",
          },

          rawText: "",
          text: "",
        });
      }

      const cleanText =
        cleanOCRText(text);

      const lines =
        getLines(cleanText);

      console.log(
        "========== OCR LINES =========="
      );

      console.log(lines);

      console.log(
        "================================"
      );

      const date =
        extractDate(cleanText);

      const amount =
        extractAmount(
          cleanText,
          lines
        );

      const vendor =
        extractVendor(lines);

      const itemName =
        extractItemName(
          lines,
          vendor
        );

      const quantity =
        extractQuantity(
          cleanText
        );

      const category =
        extractCategory(
          cleanText,
          itemName,
          vendor
        );

      const notes =
        extractNotes(
          cleanText
        );

      // OCR payment method is intentionally
      // set to Other because receipt OCR
      // may not reliably identify it.

      const paymentMethod =
        "Other";

      const extractedData = {
        date,
        itemName,
        amount,
        quantity,
        vendor,
        category,
        paymentMethod,
        notes,
      };

      console.log(
        "========== EXTRACTED DATA =========="
      );

      console.log(
        extractedData
      );

      console.log(
        "===================================="
      );

      return res.status(200).json({
        message:
          "Receipt scanned successfully",

        extractedData,

        rawText: text,

        text,
      });
    } catch (error) {
      console.error(
        "OCR ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to scan receipt",

        error:
          error.message,
      });
    }
  };

// =====================================================
// UPDATE EXPENSE
// =====================================================

export const updateExpense =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        date,
        itemName,
        amount,
        quantity,
        vendor,
        category,
        paymentMethod,
        notes,
      } = req.body;

      const expense =
        await Expense.findOne({
          _id: id,
          userId: req.userId,
        });

      if (!expense) {
        return res.status(404).json({
          message:
            "Expense not found",
        });
      }

      // DATE

      if (date) {
        const selectedDate =
          new Date(date);

        if (
          isNaN(
            selectedDate.getTime()
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid date",
          });
        }

        expense.date =
          selectedDate;

        expense.month =
          `${selectedDate.getFullYear()}-${String(
            selectedDate.getMonth() + 1
          ).padStart(2, "0")}`;
      }

      // ITEM

      if (
        itemName !== undefined
      ) {
        expense.itemName =
          String(
            itemName
          ).trim();
      }

      // AMOUNT

      if (
        amount !== undefined
      ) {
        const numericAmount =
          Number(amount);

        if (
          !Number.isFinite(
            numericAmount
          ) ||
          numericAmount <= 0
        ) {
          return res.status(400).json({
            message:
              "Amount must be greater than 0",
          });
        }

        expense.amount =
          numericAmount;
      }

      // QUANTITY

      if (
        quantity !== undefined
      ) {
        const numericQuantity =
          Number(quantity);

        if (
          !Number.isFinite(
            numericQuantity
          ) ||
          numericQuantity < 1
        ) {
          return res.status(400).json({
            message:
              "Quantity must be at least 1",
          });
        }

        expense.quantity =
          numericQuantity;
      }

      // VENDOR

      if (
        vendor !== undefined
      ) {
        expense.vendor =
          vendor;
      }

      // CATEGORY

      if (
        category !== undefined
      ) {
        expense.category =
          category || "Other";
      }

      // PAYMENT METHOD

      if (
        paymentMethod !== undefined
      ) {
        expense.paymentMethod =
          normalizePaymentMethod(
            paymentMethod
          );
      }

      // NOTES

      if (
        notes !== undefined
      ) {
        expense.notes =
          notes;
      }

      await expense.save();

      return res.status(200).json({
        message:
          "Expense updated successfully",

        expense,
      });
    } catch (error) {
      console.error(
        "UPDATE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update expense",

        error:
          error.message,
      });
    }
  };