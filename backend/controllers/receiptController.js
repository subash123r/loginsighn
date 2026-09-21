import Tesseract from "tesseract.js";

export const scanReceipt = async (req, res) => {
  try {
    // =====================================================
    // CHECK FILE
    // =====================================================

    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a receipt image",
      });
    }

    console.log("Scanning:", req.file.path);

    // =====================================================
    // OCR
    // =====================================================

    const result = await Tesseract.recognize(
      req.file.path,
      "eng"
    );

    const text = result.data.text;

    console.log("========== OCR TEXT ==========");
    console.log(text);
    console.log("==============================");

    // =====================================================
    // CLEAN TEXT
    // =====================================================

    const cleanText = text
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();

    const lines = cleanText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 1);

    console.log("OCR LINES:", lines);

    // =====================================================
    // DATE
    // Supports:
    // 19/7/2022
    // 19/07/2022
    // 19-7-2022
    // =====================================================

    let date = "";

    const dateMatch = cleanText.match(
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/
    );

    if (dateMatch) {
      let day = dateMatch[1];
      let month = dateMatch[2];
      let year = dateMatch[3];

      if (year.length === 2) {
        year = "20" + year;
      }

      date = `${year}-${month.padStart(
        2,
        "0"
      )}-${day.padStart(2, "0")}`;
    }

    // =====================================================
    // AMOUNT
    // Priority:
    // Total (AUD)
    // Total:
    // Total due
    // Grand Total
    // Amount
    // =====================================================

    let amount = 0;

    const totalPatterns = [
      /total\s*\(?.*?\)?\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,

      /total\s+due.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,

      /grand\s+total.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,

      /amount\s+due.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of totalPatterns) {
      const match = cleanText.match(pattern);

      if (match) {
        amount = Number(
          match[1].replace(/,/g, "")
        );

        break;
      }
    }

    // =====================================================
    // FALLBACK AMOUNT
    // =====================================================

    if (!amount) {
      const amountMatches = cleanText.match(
        /(?:₹|Rs\.?|INR|\$|AUD)\s*([\d,]+(?:\.\d{1,2})?)/gi
      );

      if (
        amountMatches &&
        amountMatches.length > 0
      ) {
        const numbers = amountMatches.map(
          (value) => {
            const number = value.match(
              /([\d,]+(?:\.\d{1,2})?)/
            );

            return number
              ? Number(
                  number[1].replace(/,/g, "")
                )
              : 0;
          }
        );

        amount = Math.max(...numbers);
      }
    }

    // =====================================================
    // VENDOR
    // =====================================================

    let vendor = "";

    const vendorIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes("your business")
    );

    if (vendorIndex !== -1) {
      vendor = lines[vendorIndex];

      // If OCR splits:
      // Your Business
      // Name
      if (
        lines[vendorIndex + 1] &&
        lines[vendorIndex + 1]
          .toLowerCase()
          .includes("name")
      ) {
        vendor =
          `${lines[vendorIndex]} ${lines[vendorIndex + 1]}`;
      }
    }

    // Fallback
    if (!vendor && lines.length > 0) {
      vendor = lines[0];
    }

    // =====================================================
    // ITEM NAME
    // =====================================================

    let itemName = "";

    const descriptionIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes("description")
    );

    if (descriptionIndex !== -1) {
      // Search after Description heading

      for (
        let i = descriptionIndex + 1;
        i < lines.length;
        i++
      ) {
        const currentLine = lines[i];

        // Skip table headers
        if (
          currentLine
            .toLowerCase()
            .includes("quantity")
        ) {
          continue;
        }

        if (
          currentLine
            .toLowerCase()
            .includes("unit price")
        ) {
          continue;
        }

        if (
          currentLine
            .toLowerCase()
            .includes("amount")
        ) {
          continue;
        }

        // Skip subtotal / tax / total
        if (
          /subtotal|gst|total/i.test(
            currentLine
          )
        ) {
          continue;
        }

        // Detect first meaningful product line
        if (
          /services|products|item|food|lunch|dinner|grocery/i.test(
            currentLine
          )
        ) {
          itemName = currentLine;

          break;
        }
      }
    }

    // =====================================================
    // FALLBACK ITEM
    // =====================================================

    if (!itemName) {
      const possibleItem = lines.find(
        (line) =>
          /services|products/i.test(line)
      );

      if (possibleItem) {
        itemName = possibleItem;
      }
    }

    // =====================================================
    // QUANTITY
    // =====================================================

    let quantity = 1;

    if (itemName) {
      const itemIndex =
        lines.findIndex(
          (line) => line === itemName
        );

      if (itemIndex !== -1) {
        const nextLine =
          lines[itemIndex];

        const quantityMatch =
          nextLine.match(
            /\s(\d+)\s/
          );

        if (quantityMatch) {
          quantity =
            Number(quantityMatch[1]) || 1;
        }
      }
    }

    // =====================================================
    // CATEGORY
    // =====================================================

    let category = "Other";

    const lowerText =
      cleanText.toLowerCase();

    if (
      /restaurant|food|grocery|supermarket|lunch|dinner|breakfast|meal/.test(
        lowerText
      )
    ) {
      category = "Food";
    } else if (
      /uber|taxi|bus|train|flight|travel|fuel|petrol/.test(
        lowerText
      )
    ) {
      category = "Travel";
    } else if (
      /hospital|clinic|medicine|pharmacy|medical/.test(
        lowerText
      )
    ) {
      category = "Health";
    } else if (
      /school|college|education|course|book/.test(
        lowerText
      )
    ) {
      category = "Education";
    } else if (
      /electricity|water bill|internet|mobile bill|utility/.test(
        lowerText
      )
    ) {
      category = "Bills";
    } else if (
      /movie|cinema|game|entertainment/.test(
        lowerText
      )
    ) {
      category = "Entertainment";
    } else if (
      /shopping|clothes|fashion|mall/.test(
        lowerText
      )
    ) {
      category = "Shopping";
    }

    // =====================================================
    // FINAL RESULT
    // =====================================================

    console.log("========== EXTRACTED DATA ==========");

    console.log({
      date,
      itemName,
      amount,
      quantity,
      vendor,
      category,
    });

    console.log("====================================");

    res.status(200).json({
      message: "Receipt scanned successfully",

      extractedData: {
        date,
        itemName,
        amount,
        quantity,
        vendor,
        category,
      },

      text,
    });
  } catch (error) {
    console.log("OCR ERROR:", error);

    res.status(500).json({
      message: "Failed to scan receipt",
      error: error.message,
    });
  }
};