export const MENU = {
  10: {
    id: 10,
    name: "Double Cheeseburger",
    price: 1299, // stored in cents/kobo
    options: {
      20: { name: "Extra Cheese", price: 150 },
      21: { name: "Add Bacon", price: 200 },
      22: { name: "Add Avocado", price: 150 },
      23: { name: "Plain", price: 0 }
    },
    backOption: 24
  },
  11: {
    id: 11,
    name: "Pepperoni Pizza",
    price: 1499,
    options: {
      30: { name: "Extra Cheese", price: 150 },
      31: { name: "Add Mushrooms", price: 100 },
      32: { name: "Add Pepperoni", price: 150 },
      33: { name: "Plain", price: 0 }
    },
    backOption: 34
  },
  12: {
    id: 12,
    name: "Caesar Salad",
    price: 899,
    options: {
      40: { name: "Add Chicken", price: 300 },
      41: { name: "Add Shrimp", price: 400 },
      42: { name: "Plain", price: 0 }
    },
    backOption: 43
  },
  13: {
    id: 13,
    name: "Chocolate Fudge Cake",
    price: 599,
    options: {
      50: { name: "Add Vanilla Ice Cream", price: 150 },
      51: { name: "Plain", price: 0 }
    },
    backOption: 52
  },
  14: {
    id: 14,
    name: "Iced Latte",
    price: 399,
    options: {
      60: { name: "Extra Shot Espresso", price: 100 },
      61: { name: "Caramel Drizzle", price: 50 },
      62: { name: "Oat Milk", price: 75 },
      63: { name: "Plain", price: 0 }
    },
    backOption: 64
  }
};

export function getMenuItemByNumber(num) {
  const parsed = parseInt(num, 10);
  return MENU[parsed] || null;
}

export function getOptionByNumber(itemNum, optionNum) {
  const item = getMenuItemByNumber(itemNum);
  if (!item) return null;
  const parsedOpt = parseInt(optionNum, 10);
  return item.options[parsedOpt] || null;
}
