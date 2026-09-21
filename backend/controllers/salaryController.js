import Salary from "../models/Salary.js";

// ADD / UPDATE MONTHLY SALARY
export const saveSalary = async (req, res) => {
  try {
    const { month, amount } = req.body;

    if (!month || amount === undefined) {
      return res.status(400).json({
        message: "Month and amount are required",
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        message: "Salary cannot be negative",
      });
    }

    const salary = await Salary.findOneAndUpdate(
      {
        userId: req.userId,
        month,
      },
      {
        userId: req.userId,
        month,
        amount,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      message: "Salary saved successfully",
      salary,
    });
  } catch (error) {
    console.log("SALARY ERROR:", error);

    res.status(500).json({
      message: "Failed to save salary",
      error: error.message,
    });
  }
};


// GET SALARY FOR MONTH
export const getSalary = async (req, res) => {
  try {
    const { month } = req.params;

    const salary = await Salary.findOne({
      userId: req.userId,
      month,
    });

    if (!salary) {
      return res.status(200).json({
        month,
        amount: 0,
      });
    }

    res.status(200).json(salary);
  } catch (error) {
    console.log("GET SALARY ERROR:", error);

    res.status(500).json({
      message: "Failed to get salary",
      error: error.message,
    });
  }
};