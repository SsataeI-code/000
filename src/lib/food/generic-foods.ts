import type { NormalizedFood } from "@/lib/food/off";

/**
 * Built-in generic foods (§6 fallback for when Open Food Facts is thin on plain,
 * unbranded items like "white bread" or "chicken breast").
 *
 * Values are STANDARD REFERENCE macros per 100 g (USDA-style, cooked where a
 * food is normally eaten cooked). These are established reference figures, not
 * invented — the app never fabricates nutrition numbers (CLAUDE.md §16). They're
 * estimates by nature; the client can always adjust before logging.
 *
 * Row: [name, kcal, protein_g, carbs_g, fat_g, typicalServingG, keywords]
 */
type Row = [string, number, number, number, number, number, string];

const FOODS: Row[] = [
  // --- Poultry ---
  ["Chicken breast, cooked", 165, 31, 0, 3.6, 120, "grilled roast skinless"],
  ["Chicken thigh, cooked", 209, 26, 0, 10.9, 100, "dark meat"],
  ["Chicken wing, cooked", 203, 30, 0, 8.1, 40, "wings"],
  ["Rotisserie chicken", 190, 25, 0, 10, 120, "roast chicken"],
  ["Ground chicken, cooked", 189, 24, 0, 10, 100, "mince"],
  ["Turkey breast, cooked", 135, 30, 0, 1, 100, "roast deli"],
  ["Ground turkey, cooked", 203, 27, 0, 10, 100, "mince"],
  ["Duck breast, cooked", 201, 24, 0, 11, 100, ""],

  // --- Beef & red meat ---
  ["Ground beef 80/20, cooked", 254, 26, 0, 16, 100, "hamburger mince"],
  ["Ground beef 90/10, cooked", 176, 26, 0, 8, 100, "lean mince"],
  ["Beef steak, cooked", 271, 25, 0, 19, 150, "sirloin ribeye"],
  ["Beef, lean roast", 187, 30, 0, 7, 120, ""],
  ["Pork chop, cooked", 231, 26, 0, 14, 120, ""],
  ["Pork tenderloin, cooked", 143, 26, 0, 4, 120, ""],
  ["Bacon, cooked", 541, 37, 1.4, 42, 20, "streaky"],
  ["Ham, sliced", 145, 18, 1.5, 7, 50, "deli"],
  ["Sausage, pork, cooked", 301, 18, 2, 24, 75, "banger"],
  ["Lamb chop, cooked", 294, 25, 0, 21, 120, ""],
  ["Hot dog", 290, 10, 4, 26, 50, "frankfurter wiener"],
  ["Salami", 336, 22, 2, 26, 30, ""],
  ["Pepperoni", 504, 20, 1, 46, 15, ""],

  // --- Fish & seafood ---
  ["Salmon, cooked", 208, 22, 0, 13, 120, "fillet"],
  ["Tuna, canned in water", 116, 26, 0, 1, 100, "chunk"],
  ["Tuna steak, cooked", 184, 30, 0, 6, 120, "ahi"],
  ["Tilapia, cooked", 128, 26, 0, 3, 120, "white fish"],
  ["Cod, cooked", 105, 23, 0, 1, 120, "white fish"],
  ["Shrimp, cooked", 99, 24, 0, 0.3, 85, "prawns"],
  ["Canned sardines", 208, 25, 0, 11, 50, ""],
  ["Salmon, smoked", 117, 18, 0, 4.3, 50, "lox"],

  // --- Eggs & dairy ---
  ["Egg, whole", 155, 13, 1.1, 11, 50, "eggs"],
  ["Egg white", 52, 11, 0.7, 0.2, 33, "whites"],
  ["Scrambled eggs", 149, 10, 1.6, 11, 100, ""],
  ["Milk, whole", 61, 3.2, 4.8, 3.3, 240, "dairy"],
  ["Milk, 2%", 50, 3.4, 4.8, 2, 240, "reduced fat"],
  ["Milk, skim", 34, 3.4, 5, 0.1, 240, "nonfat"],
  ["Greek yogurt, plain nonfat", 59, 10, 3.6, 0.4, 170, "fat free"],
  ["Greek yogurt, whole", 97, 9, 4, 5, 170, ""],
  ["Yogurt, plain", 61, 3.5, 4.7, 3.3, 170, ""],
  ["Cottage cheese", 98, 11, 3.4, 4.3, 110, ""],
  ["Cheddar cheese", 403, 25, 1.3, 33, 30, ""],
  ["Mozzarella cheese", 280, 28, 3.1, 17, 30, ""],
  ["Parmesan cheese", 431, 38, 4, 29, 15, "parmigiano"],
  ["Cream cheese", 342, 6, 4, 34, 30, ""],
  ["Butter", 717, 0.9, 0.1, 81, 14, ""],
  ["Feta cheese", 264, 14, 4, 21, 30, ""],
  ["Swiss cheese", 380, 27, 5, 28, 30, ""],
  ["American cheese", 371, 18, 9, 30, 20, "single slice"],
  ["Heavy cream", 340, 2.8, 2.8, 36, 30, "double"],
  ["Ice cream, vanilla", 207, 3.5, 24, 11, 65, ""],

  // --- Milk alternatives ---
  ["Almond milk, unsweetened", 15, 0.6, 0.6, 1.2, 240, "plant"],
  ["Oat milk", 47, 1, 7, 1.5, 240, "plant"],
  ["Soy milk", 43, 3.3, 3, 1.8, 240, "plant"],

  // --- Grains, bread, pasta ---
  ["White rice, cooked", 130, 2.7, 28, 0.3, 158, "steamed"],
  ["Brown rice, cooked", 123, 2.7, 26, 1, 158, ""],
  ["White bread", 265, 9, 49, 3.2, 30, "toast slice loaf"],
  ["Whole wheat bread", 247, 13, 41, 3.4, 30, "brown bread toast"],
  ["Bagel, plain", 250, 10, 49, 1.5, 90, ""],
  ["Pasta, cooked", 158, 6, 31, 0.9, 140, "spaghetti penne noodles"],
  ["Whole wheat pasta, cooked", 149, 6, 30, 1.3, 140, ""],
  ["Oats, dry", 389, 17, 66, 7, 40, "oatmeal porridge"],
  ["Oatmeal, cooked", 71, 2.5, 12, 1.5, 234, "porridge"],
  ["Quinoa, cooked", 120, 4.4, 21, 1.9, 185, ""],
  ["Couscous, cooked", 112, 3.8, 23, 0.2, 157, ""],
  ["Tortilla, flour", 304, 8, 51, 7, 45, "wrap"],
  ["Tortilla, corn", 218, 5.7, 45, 2.9, 26, ""],
  ["Cereal, corn flakes", 357, 7, 84, 0.4, 30, ""],
  ["Granola", 471, 10, 64, 20, 50, ""],
  ["Pancakes", 227, 6, 28, 10, 80, "flapjack"],
  ["Waffle", 291, 8, 33, 14, 75, ""],
  ["English muffin", 235, 8, 46, 1.8, 60, ""],
  ["Croissant", 406, 8, 46, 21, 60, ""],
  ["Naan bread", 310, 9, 50, 8, 90, ""],
  ["Pita bread", 275, 9, 55, 1.2, 60, ""],
  ["Rice cake", 387, 8, 82, 2.8, 9, ""],
  ["Crackers", 439, 8, 62, 16, 15, "saltine"],
  ["Couscous", 112, 3.8, 23, 0.2, 157, ""],

  // --- Legumes ---
  ["Black beans, cooked", 132, 8.9, 24, 0.5, 172, "frijoles"],
  ["Chickpeas, cooked", 164, 8.9, 27, 2.6, 164, "garbanzo"],
  ["Lentils, cooked", 116, 9, 20, 0.4, 198, "dal"],
  ["Kidney beans, cooked", 127, 8.7, 23, 0.5, 177, ""],
  ["Pinto beans, cooked", 143, 9, 26, 0.7, 171, ""],
  ["Edamame", 121, 12, 9, 5, 155, "soybeans"],
  ["Hummus", 166, 8, 14, 10, 30, ""],
  ["Refried beans", 91, 5, 15, 1.5, 120, ""],
  ["Baked beans", 94, 5, 20, 0.3, 130, ""],
  ["Tofu, firm", 144, 17, 3, 9, 100, "bean curd"],
  ["Tempeh", 192, 20, 8, 11, 100, ""],
  ["Peas, green", 81, 5.4, 14, 0.4, 145, ""],

  // --- Nuts, seeds, spreads ---
  ["Almonds", 579, 21, 22, 50, 28, ""],
  ["Peanuts", 567, 26, 16, 49, 28, ""],
  ["Peanut butter", 588, 25, 20, 50, 32, ""],
  ["Almond butter", 614, 21, 19, 56, 32, ""],
  ["Walnuts", 654, 15, 14, 65, 28, ""],
  ["Cashews", 553, 18, 30, 44, 28, ""],
  ["Pistachios", 560, 20, 28, 45, 28, ""],
  ["Chia seeds", 486, 17, 42, 31, 15, ""],
  ["Flax seeds", 534, 18, 29, 42, 12, "linseed"],
  ["Pumpkin seeds", 559, 30, 11, 49, 28, "pepitas"],
  ["Sunflower seeds", 584, 21, 20, 51, 28, ""],
  ["Mixed nuts", 607, 20, 21, 54, 28, ""],

  // --- Fruits ---
  ["Apple", 52, 0.3, 14, 0.2, 182, ""],
  ["Banana", 89, 1.1, 23, 0.3, 118, ""],
  ["Orange", 47, 0.9, 12, 0.1, 131, ""],
  ["Strawberries", 32, 0.7, 7.7, 0.3, 152, "berries"],
  ["Blueberries", 57, 0.7, 14, 0.3, 148, "berries"],
  ["Grapes", 69, 0.7, 18, 0.2, 150, ""],
  ["Watermelon", 30, 0.6, 7.6, 0.2, 152, ""],
  ["Pineapple", 50, 0.5, 13, 0.1, 165, ""],
  ["Mango", 60, 0.8, 15, 0.4, 165, ""],
  ["Avocado", 160, 2, 9, 15, 100, ""],
  ["Peach", 39, 0.9, 10, 0.3, 150, ""],
  ["Pear", 57, 0.4, 15, 0.1, 178, ""],
  ["Cherries", 63, 1.1, 16, 0.2, 138, ""],
  ["Raspberries", 52, 1.2, 12, 0.7, 123, "berries"],
  ["Kiwi", 61, 1.1, 15, 0.5, 69, ""],
  ["Cantaloupe", 34, 0.8, 8, 0.2, 160, "melon"],
  ["Grapefruit", 42, 0.8, 11, 0.1, 123, ""],
  ["Dates", 282, 2.5, 75, 0.4, 24, ""],
  ["Raisins", 299, 3.1, 79, 0.5, 43, ""],
  ["Lemon", 29, 1.1, 9, 0.3, 58, ""],

  // --- Vegetables ---
  ["Broccoli", 34, 2.8, 7, 0.4, 91, ""],
  ["Spinach", 23, 2.9, 3.6, 0.4, 30, ""],
  ["Carrots", 41, 0.9, 10, 0.2, 128, ""],
  ["Sweet potato, cooked", 90, 2, 21, 0.2, 130, "yam"],
  ["Potato, cooked", 87, 2, 20, 0.1, 173, "boiled"],
  ["Baked potato", 93, 2.5, 21, 0.1, 173, ""],
  ["French fries", 312, 3.4, 41, 15, 117, "chips fries"],
  ["Corn", 96, 3.4, 21, 1.5, 154, "sweetcorn"],
  ["Tomato", 18, 0.9, 3.9, 0.2, 123, ""],
  ["Cucumber", 15, 0.7, 3.6, 0.1, 104, ""],
  ["Lettuce", 15, 1.4, 2.9, 0.2, 47, "romaine"],
  ["Bell pepper", 31, 1, 6, 0.3, 119, "capsicum"],
  ["Onion", 40, 1.1, 9, 0.1, 110, ""],
  ["Mushrooms", 22, 3.1, 3.3, 0.3, 96, ""],
  ["Zucchini", 17, 1.2, 3.1, 0.3, 124, "courgette"],
  ["Green beans", 31, 1.8, 7, 0.2, 100, ""],
  ["Cauliflower", 25, 1.9, 5, 0.3, 107, ""],
  ["Cabbage", 25, 1.3, 6, 0.1, 89, ""],
  ["Asparagus", 20, 2.2, 3.9, 0.1, 134, ""],
  ["Kale", 49, 4.3, 9, 0.9, 67, ""],
  ["Celery", 16, 0.7, 3, 0.2, 110, ""],
  ["Brussels sprouts", 43, 3.4, 9, 0.3, 88, ""],
  ["Eggplant", 25, 1, 6, 0.2, 82, "aubergine"],
  ["Peas", 81, 5.4, 14, 0.4, 145, ""],
  ["Beets", 43, 1.6, 10, 0.2, 136, "beetroot"],
  ["Butternut squash", 45, 1, 12, 0.1, 140, ""],
  ["Coleslaw", 152, 1.5, 14, 11, 100, ""],

  // --- Oils & fats ---
  ["Olive oil", 884, 0, 0, 100, 14, "evoo"],
  ["Vegetable oil", 884, 0, 0, 100, 14, "canola"],
  ["Coconut oil", 862, 0, 0, 100, 14, ""],
  ["Mayonnaise", 680, 1, 0.6, 75, 15, "mayo"],

  // --- Condiments & sauces ---
  ["Ketchup", 101, 1.2, 26, 0.1, 17, ""],
  ["Mustard", 66, 4, 6, 3.5, 5, ""],
  ["Soy sauce", 53, 8, 5, 0.6, 16, ""],
  ["BBQ sauce", 172, 0.8, 41, 0.6, 17, ""],
  ["Ranch dressing", 430, 1, 6, 45, 30, ""],
  ["Marinara sauce", 56, 1.6, 9, 1.6, 125, "pasta sauce tomato"],
  ["Salsa", 36, 1.5, 7, 0.2, 30, ""],
  ["Honey", 304, 0.3, 82, 0, 21, ""],
  ["Maple syrup", 260, 0, 67, 0.1, 20, ""],
  ["Jam", 278, 0.4, 69, 0.1, 20, "jelly preserves"],

  // --- Sweets & snacks ---
  ["Potato chips", 536, 7, 53, 35, 28, "crisps"],
  ["Tortilla chips", 466, 7, 66, 19, 28, ""],
  ["Popcorn", 387, 12, 78, 4.5, 30, ""],
  ["Chocolate, milk", 535, 7.6, 59, 30, 40, "candy bar"],
  ["Chocolate, dark", 546, 5, 61, 31, 30, ""],
  ["Cookie", 474, 5, 65, 22, 30, "biscuit"],
  ["Donut", 452, 5, 51, 25, 60, "doughnut"],
  ["Muffin", 377, 6, 55, 15, 110, ""],
  ["Brownie", 466, 6, 50, 28, 60, ""],
  ["Cake, frosted", 371, 4, 55, 15, 100, ""],
  ["Candy, gummy", 396, 0, 98, 0, 40, "gummies"],
  ["Pretzels", 380, 10, 80, 3, 30, ""],
  ["Granola bar", 471, 8, 64, 20, 40, "protein bar"],
  ["Trail mix", 462, 14, 45, 29, 40, ""],

  // --- Prepared / fast foods ---
  ["Cheeseburger", 250, 12, 24, 12, 150, "burger"],
  ["Pizza, cheese", 266, 11, 33, 10, 107, ""],
  ["Pizza, pepperoni", 298, 13, 34, 12, 111, ""],
  ["Burrito", 206, 8, 27, 7, 200, ""],
  ["Taco", 226, 9, 21, 12, 100, ""],
  ["Sushi roll", 145, 5, 30, 0.6, 100, ""],
  ["Fried rice", 163, 5, 21, 6, 150, ""],
  ["Mac and cheese", 164, 6, 20, 6.6, 150, "macaroni"],
  ["Chicken nuggets", 296, 15, 16, 19, 90, ""],
  ["Grilled cheese", 291, 11, 28, 15, 120, ""],
  ["Caesar salad", 190, 5, 8, 15, 150, ""],
  ["Ramen noodles", 436, 9, 63, 16, 43, "instant noodles"],
  ["Chicken soup", 36, 2, 4, 1.2, 245, ""],
  ["Beef stew", 79, 6, 7, 3, 245, ""],

  // --- Beverages ---
  ["Orange juice", 45, 0.7, 10, 0.2, 240, "oj"],
  ["Apple juice", 46, 0.1, 11, 0.1, 240, ""],
  ["Cola", 42, 0, 11, 0, 355, "soda coke"],
  ["Beer", 43, 0.5, 3.6, 0, 355, ""],
  ["Wine, red", 85, 0.1, 2.6, 0, 150, ""],
  ["Coffee, black", 1, 0.1, 0, 0, 240, ""],
  ["Latte", 42, 2.2, 4.2, 1.5, 240, "coffee"],
  ["Sports drink", 26, 0, 6, 0, 355, "gatorade"],
  ["Energy drink", 45, 0, 11, 0, 250, ""],

  // --- Protein & supplements ---
  ["Whey protein powder", 400, 80, 8, 6, 30, "shake scoop"],
  ["Plant protein powder", 375, 75, 10, 5, 30, "vegan"],
  ["Protein shake, ready", 67, 8, 4, 1.5, 330, ""],
];

/** Turn one reference row into the same NormalizedFood shape as an OFF result. */
function toNormalized(row: Row): NormalizedFood {
  const [name, kcal, protein, carbs, fat, servingG] = row;
  return {
    barcode: "", // generics have no barcode; logs store null
    name,
    brand: "Generic",
    imageUrl: null,
    servingSizeG: servingG,
    per100g: { calories: kcal, proteinG: protein, carbsG: carbs, fatG: fat },
    nutrimentsPer100g: { energy_kcal: kcal, proteins: protein, carbohydrates: carbs, fat },
    missing: [],
  };
}

/** Rank a food against the query: exact > prefix > word-boundary > substring. */
function score(name: string, keywords: string, q: string): number {
  const n = name.toLowerCase();
  const k = keywords.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  const words = q.split(/\s+/).filter(Boolean);
  const inName = words.every((w) => n.includes(w));
  const inKeywords = words.every((w) => k.includes(w) || n.includes(w));
  if (inName) return 60;
  if (n.includes(q)) return 40;
  if (inKeywords) return 30;
  if (words.some((w) => n.includes(w) || k.includes(w))) return 15;
  return 0;
}

/** Search the built-in generic table. Pure — no network. */
export function searchGenericFoods(query: string, limit = 6): NormalizedFood[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return FOODS.map((row) => ({ row, s: score(row[0], row[6], q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => toNormalized(x.row));
}

export const GENERIC_FOOD_COUNT = FOODS.length;
