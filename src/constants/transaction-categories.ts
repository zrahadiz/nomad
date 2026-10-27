export const transactionCategories = {
  expense: [
    { id: "food", name: "Food & Drinks" },
    { id: "transport", name: "Transportation" },
    { id: "shopping", name: "Shopping" },
    { id: "housing", name: "Housing & Rent" },
    { id: "utilities", name: "Utilities" },
    { id: "education", name: "Education" },
    { id: "health", name: "Health & Medical" },
    { id: "entertainment", name: "Entertainment" },
    { id: "travel", name: "Travel" },
    { id: "subscriptions", name: "Subscriptions" },
    { id: "other-expense", name: "Other" },
  ],

  income: [
    { id: "salary", name: "Salary" },
    { id: "allowance", name: "Allowance" },
    { id: "freelance", name: "Freelance" },
    { id: "business", name: "Business" },
    { id: "investment", name: "Investment Returns" },
    { id: "interest", name: "Interest" },
    { id: "gift", name: "Gifts" },
    { id: "refund", name: "Refunds" },
    { id: "other-income", name: "Other" },
  ],
} as const;
