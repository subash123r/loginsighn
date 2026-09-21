import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    itemName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    category: {
      type: String,
      default: "Other",
    },

    vendor: {
      type: String,
      default: "",
    },

    receiptImage: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },
    paymentMethod: {
  type: String,
  enum: [
    "Cash",
    "UPI",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Other",
  ],
  default: "Other",
},
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Expense", expenseSchema);