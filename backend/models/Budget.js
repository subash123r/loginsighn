import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },

    categoryBudgets: {
      Food: {
        type: Number,
        default: 0,
      },
      Travel: {
        type: Number,
        default: 0,
      },
      Shopping: {
        type: Number,
        default: 0,
      },
      Bills: {
        type: Number,
        default: 0,
      },
      Health: {
        type: Number,
        default: 0,
      },
      Entertainment: {
        type: Number,
        default: 0,
      },
      Education: {
        type: Number,
        default: 0,
      },
      Other: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index(
  { userId: 1, month: 1 },
  { unique: true }
);

export default mongoose.model("Budget", budgetSchema);