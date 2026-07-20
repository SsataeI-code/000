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
  ["Mass gainer powder", 380, 20, 65, 5, 100, "weight gainer"],
  ["Creatine", 0, 0, 0, 0, 5, "supplement"],

  // --- More breads (each slice unique) ---
  ["Rye bread", 259, 8.5, 48, 3.3, 32, "rye slice"],
  ["Sourdough bread", 289, 12, 56, 1.8, 40, "sourdough slice"],
  ["Multigrain bread", 265, 13, 43, 4, 32, "multigrain slice seeded"],
  ["Pumpernickel bread", 250, 8.7, 47, 3.1, 32, "pumpernickel slice"],
  ["Sprouted grain bread", 250, 12, 43, 2, 34, "ezekiel slice"],
  ["Ciabatta bread", 271, 9, 52, 2.6, 50, "ciabatta"],
  ["Brioche", 330, 9, 51, 10, 40, "brioche slice"],
  ["Hamburger bun", 294, 9, 51, 5, 52, "burger bun"],
  ["Hot dog bun", 279, 9, 50, 4, 43, ""],
  ["Dinner roll", 300, 9, 53, 6, 35, "bread roll"],
  ["Baguette", 274, 9, 55, 1.5, 60, "french bread"],
  ["Cornbread", 330, 7, 47, 12, 65, ""],
  ["Focaccia", 291, 8, 47, 8, 50, ""],
  ["Texas toast", 300, 8, 44, 10, 40, "thick slice"],
  ["Gluten-free bread", 246, 4, 45, 5, 30, "gf slice"],

  // --- More proteins ---
  ["Ground pork, cooked", 297, 26, 0, 21, 100, "mince"],
  ["Pork ribs, cooked", 361, 26, 0, 28, 150, "baby back"],
  ["Beef brisket, cooked", 246, 28, 0, 14, 120, ""],
  ["Corned beef", 251, 18, 0.5, 19, 80, ""],
  ["Beef jerky", 410, 33, 11, 26, 28, ""],
  ["Meatball, beef", 197, 20, 6, 10, 90, "meatballs"],
  ["Turkey bacon", 226, 30, 3, 11, 20, ""],
  ["Chicken sausage", 172, 17, 3, 10, 75, ""],
  ["Prosciutto", 195, 24, 1, 11, 30, ""],
  ["Halibut, cooked", 111, 23, 0, 2, 120, "white fish"],
  ["Mackerel, cooked", 262, 24, 0, 18, 100, ""],
  ["Crab, cooked", 97, 19, 0, 1.5, 85, ""],
  ["Lobster, cooked", 89, 19, 0, 0.9, 85, ""],
  ["Scallops, cooked", 111, 20, 5, 0.8, 85, ""],
  ["Catfish, cooked", 105, 18, 0, 3, 120, ""],
  ["Anchovies", 210, 29, 0, 10, 20, ""],

  // --- More dairy ---
  ["Ricotta cheese", 174, 11, 3, 13, 60, ""],
  ["Provolone cheese", 351, 26, 2, 27, 30, ""],
  ["Gouda cheese", 356, 25, 2, 27, 30, ""],
  ["Blue cheese", 353, 21, 2, 29, 30, ""],
  ["Goat cheese", 364, 22, 2.5, 30, 30, "chevre"],
  ["String cheese", 300, 24, 3, 22, 28, "mozzarella stick"],
  ["Sour cream", 198, 2.4, 4.6, 19, 30, ""],
  ["Half and half", 131, 3, 4.3, 11, 30, ""],
  ["Kefir", 41, 3.3, 4.5, 1, 240, ""],
  ["Frozen yogurt", 159, 4, 24, 6, 100, "froyo"],
  ["Whipped cream", 257, 3.2, 12, 22, 15, ""],
  ["Egg yolk", 322, 16, 3.6, 27, 17, ""],

  // --- More grains & cereal ---
  ["Basmati rice, cooked", 121, 3, 25, 0.4, 158, ""],
  ["Wild rice, cooked", 101, 4, 21, 0.3, 164, ""],
  ["Farro, cooked", 127, 4.5, 26, 0.9, 150, ""],
  ["Barley, cooked", 123, 2.3, 28, 0.4, 157, ""],
  ["Bulgur, cooked", 83, 3, 19, 0.2, 182, ""],
  ["Grits, cooked", 71, 1.4, 16, 0.2, 182, ""],
  ["Cream of wheat", 64, 1.9, 13, 0.2, 180, "farina"],
  ["Muesli", 350, 10, 66, 6, 45, ""],
  ["Bran flakes", 321, 10, 80, 2, 30, ""],
  ["Shredded wheat", 340, 11, 78, 2, 45, ""],
  ["Rice cereal, puffed", 402, 6, 87, 4, 30, "rice krispies"],
  ["Oat bran", 246, 17, 66, 7, 40, ""],
  ["Cheerios", 367, 12, 73, 7, 30, "oat cereal"],
  ["Granola cereal", 471, 10, 64, 20, 50, ""],

  // --- More legumes & plant protein ---
  ["Navy beans, cooked", 140, 8, 26, 0.6, 182, ""],
  ["Lima beans, cooked", 115, 8, 21, 0.4, 170, "butter beans"],
  ["Black-eyed peas, cooked", 116, 8, 21, 0.5, 170, ""],
  ["Split peas, cooked", 118, 8, 21, 0.4, 196, ""],
  ["Falafel", 333, 13, 32, 18, 60, ""],
  ["Soybeans, cooked", 173, 17, 10, 9, 172, ""],
  ["Seitan", 141, 25, 6, 2, 100, "wheat gluten"],

  // --- More nuts, seeds, spreads ---
  ["Pecans", 691, 9, 14, 72, 28, ""],
  ["Macadamia nuts", 718, 8, 14, 76, 28, ""],
  ["Hazelnuts", 628, 15, 17, 61, 28, ""],
  ["Brazil nuts", 656, 14, 12, 66, 28, ""],
  ["Tahini", 595, 17, 21, 54, 15, "sesame paste"],
  ["Sunflower seed butter", 617, 17, 24, 55, 32, "sunbutter"],
  ["Nutella", 539, 6, 57, 31, 20, "hazelnut spread"],
  ["Coconut, shredded", 660, 7, 24, 64, 20, ""],

  // --- More fruits ---
  ["Plum", 46, 0.7, 11, 0.3, 66, ""],
  ["Apricot", 48, 1.4, 11, 0.4, 35, ""],
  ["Nectarine", 44, 1.1, 11, 0.3, 140, ""],
  ["Blackberries", 43, 1.4, 10, 0.5, 144, "berries"],
  ["Cranberries", 46, 0.4, 12, 0.1, 100, ""],
  ["Pomegranate", 83, 1.7, 19, 1.2, 87, ""],
  ["Fig", 74, 0.8, 19, 0.3, 50, ""],
  ["Papaya", 43, 0.5, 11, 0.3, 145, ""],
  ["Clementine", 47, 0.9, 12, 0.2, 74, "mandarin"],
  ["Honeydew melon", 36, 0.5, 9, 0.1, 160, ""],
  ["Coconut water", 19, 0.7, 3.7, 0.2, 240, ""],
  ["Prunes", 240, 2.2, 64, 0.4, 25, ""],
  ["Dried apricots", 241, 3.4, 63, 0.5, 30, ""],

  // --- More vegetables ---
  ["Arugula", 25, 2.6, 3.7, 0.7, 20, "rocket"],
  ["Collard greens", 32, 3, 5.4, 0.6, 130, ""],
  ["Swiss chard", 19, 1.8, 3.7, 0.2, 36, ""],
  ["Radish", 16, 0.7, 3.4, 0.1, 116, ""],
  ["Turnip", 28, 0.9, 6.4, 0.1, 130, ""],
  ["Parsnip", 75, 1.2, 18, 0.3, 133, ""],
  ["Okra", 33, 1.9, 7.5, 0.2, 100, ""],
  ["Artichoke", 47, 3.3, 11, 0.2, 120, ""],
  ["Leek", 61, 1.5, 14, 0.3, 89, ""],
  ["Snap peas", 42, 2.8, 7.5, 0.2, 100, "sugar snap"],
  ["Bok choy", 13, 1.5, 2.2, 0.2, 70, ""],
  ["Spaghetti squash, cooked", 27, 0.6, 6.5, 0.3, 155, ""],
  ["Acorn squash, cooked", 56, 1.1, 15, 0.1, 140, ""],
  ["Pumpkin, cooked", 20, 0.7, 4.9, 0.1, 116, ""],
  ["Garlic", 149, 6.4, 33, 0.5, 3, ""],
  ["Ginger", 80, 1.8, 18, 0.8, 6, ""],
  ["Jalapeno", 29, 0.9, 6.5, 0.4, 14, "pepper"],
  ["Pickles", 11, 0.3, 2.3, 0.2, 30, "pickle dill"],
  ["Sauerkraut", 19, 0.9, 4.3, 0.1, 100, ""],
  ["Sun-dried tomatoes", 258, 14, 56, 3, 20, ""],

  // --- More prepared / restaurant ---
  ["Lasagna", 135, 8, 12, 6, 250, ""],
  ["Spaghetti with meat sauce", 132, 6, 17, 4, 250, ""],
  ["Chicken stir fry", 120, 11, 9, 5, 250, ""],
  ["Pad thai", 154, 7, 20, 5, 250, ""],
  ["Chicken curry", 130, 10, 6, 7, 250, ""],
  ["Chili con carne", 112, 8, 9, 5, 250, "chili"],
  ["Quesadilla", 280, 12, 26, 15, 150, ""],
  ["Nachos", 306, 8, 32, 17, 150, ""],
  ["Gyro", 215, 12, 14, 12, 200, "shawarma"],
  ["Club sandwich", 230, 12, 22, 10, 200, ""],
  ["BLT sandwich", 250, 9, 24, 13, 180, ""],
  ["Tuna salad", 187, 16, 5, 11, 100, ""],
  ["Chicken salad", 200, 13, 3, 15, 100, ""],
  ["Egg salad", 210, 9, 2, 18, 100, ""],
  ["Chicken pot pie", 240, 8, 22, 14, 220, ""],
  ["Dumplings", 190, 7, 24, 7, 100, "potstickers gyoza"],
  ["Spring roll", 154, 4, 20, 6, 60, ""],
  ["Egg roll", 222, 6, 24, 11, 89, ""],
  ["Samosa", 262, 5, 32, 12, 60, ""],
  ["Meatloaf", 220, 15, 9, 13, 150, ""],
  ["Shepherd's pie", 125, 7, 11, 6, 250, ""],
  ["Fish and chips", 230, 11, 22, 12, 250, ""],
  ["Chicken parmesan", 210, 17, 11, 11, 200, ""],
  ["Beef taco, hard shell", 226, 9, 21, 12, 100, ""],
  ["Ramen, restaurant", 90, 5, 12, 3, 400, "noodle soup"],
  ["Miso soup", 40, 3, 4, 1.5, 240, ""],
  ["Omelette", 154, 11, 1, 12, 120, ""],
  ["Breakfast sandwich", 250, 12, 24, 12, 140, "bacon egg cheese"],
  ["Hash browns", 265, 3, 28, 16, 100, ""],
  ["French toast", 229, 8, 25, 11, 65, ""],
  ["Breakfast burrito", 190, 9, 18, 9, 220, ""],
  ["Avocado toast", 200, 6, 22, 11, 120, ""],
  ["Poke bowl", 130, 9, 15, 4, 300, ""],
  ["Buddha bowl", 120, 5, 18, 4, 300, "grain bowl"],
  ["Cobb salad", 150, 10, 6, 10, 200, ""],
  ["Greek salad", 110, 3, 6, 9, 150, ""],

  // --- More snacks & sweets ---
  ["Cheese crackers", 490, 9, 60, 24, 30, "cheez-it"],
  ["Graham crackers", 423, 6, 77, 10, 28, ""],
  ["Pop tart", 397, 4, 71, 10, 52, "toaster pastry"],
  ["Cereal bar", 400, 4, 75, 9, 37, ""],
  ["Rice krispies treat", 400, 2, 82, 8, 22, ""],
  ["Cheese puffs", 557, 6, 54, 35, 28, "cheetos"],
  ["Fruit snacks", 340, 0, 82, 0, 26, "gummy"],
  ["Marshmallow", 318, 1.8, 81, 0.2, 20, ""],
  ["Caramel", 382, 4, 77, 8, 20, ""],
  ["Peanut butter cup", 515, 10, 52, 30, 40, ""],
  ["Skittles", 405, 0, 91, 4, 40, ""],
  ["Twizzlers", 351, 2, 82, 1, 40, "licorice"],
  ["Cheesecake", 321, 6, 26, 22, 100, ""],
  ["Apple pie", 265, 2, 38, 12, 125, ""],
  ["Pudding", 130, 3, 22, 3.5, 120, ""],
  ["Jello", 62, 1.2, 14, 0, 100, "gelatin"],
  ["Fudge", 411, 2, 76, 11, 30, ""],

  // --- More beverages ---
  ["Lemonade", 40, 0.1, 10, 0, 240, ""],
  ["Iced tea, sweetened", 30, 0, 8, 0, 240, "sweet tea"],
  ["Smoothie, fruit", 60, 1, 14, 0.5, 240, ""],
  ["Milkshake", 112, 3, 18, 3, 240, ""],
  ["Hot chocolate", 77, 3.5, 12, 2.3, 240, "cocoa"],
  ["Kombucha", 12, 0, 3, 0, 240, ""],
  ["Diet soda", 0, 0, 0, 0, 355, "diet coke"],
  ["Cappuccino", 33, 1.8, 3, 1.8, 180, "coffee"],
  ["Espresso", 9, 0.1, 1.7, 0.2, 30, "coffee"],
  ["Whiskey", 250, 0, 0, 0, 44, "liquor bourbon"],
  ["Vodka", 231, 0, 0, 0, 44, "liquor"],
  ["Margarita", 153, 0.1, 18, 0.1, 120, "cocktail"],
  ["Champagne", 76, 0.1, 1.2, 0, 120, "sparkling wine"],
  ["Protein coffee", 30, 4, 2, 1, 300, ""],

  // --- More condiments & fats ---
  ["Sriracha", 93, 2, 19, 1, 15, "hot sauce"],
  ["Hot sauce", 11, 0.5, 1.8, 0.4, 5, "tabasco"],
  ["Teriyaki sauce", 89, 5.9, 16, 0, 18, ""],
  ["Guacamole", 155, 2, 9, 13, 30, "guac"],
  ["Pesto", 418, 5, 6, 42, 16, ""],
  ["Gravy", 54, 2, 5, 3, 60, ""],
  ["Alfredo sauce", 232, 4, 5, 22, 60, ""],
  ["Honey mustard", 160, 1, 22, 8, 15, ""],
  ["Balsamic vinaigrette", 258, 0.4, 12, 23, 15, "dressing"],
  ["Italian dressing", 240, 0.5, 8, 23, 30, ""],
  ["Blue cheese dressing", 484, 2, 4, 51, 30, ""],
  ["Cocktail sauce", 130, 1.5, 30, 0.5, 30, ""],
  ["Cream cheese, whipped", 300, 5, 5, 29, 20, ""],
  ["Coconut milk", 230, 2.3, 6, 24, 80, "canned"],

  // --- Beef, all cuts ---
  ["Beef chuck roast, cooked", 250, 30, 0, 14, 120, "pot roast"],
  ["Beef ribeye steak, cooked", 291, 24, 0, 22, 150, "rib eye"],
  ["Beef sirloin steak, cooked", 206, 29, 0, 9, 150, ""],
  ["Beef tenderloin, cooked", 247, 27, 0, 15, 150, "filet mignon"],
  ["Beef flank steak, cooked", 192, 28, 0, 8, 120, ""],
  ["Beef skirt steak, cooked", 220, 27, 0, 12, 120, ""],
  ["Beef round roast, cooked", 180, 30, 0, 6, 120, "eye of round"],
  ["Beef short ribs, cooked", 471, 22, 0, 42, 120, ""],
  ["Beef tri-tip, cooked", 211, 26, 0, 11, 120, ""],
  ["Prime rib, cooked", 338, 24, 0, 27, 150, "standing rib"],
  ["Ground beef 85/15, cooked", 215, 26, 0, 12, 100, "mince"],
  ["Ground beef 93/7, cooked", 152, 26, 0, 6, 100, "lean mince"],
  ["Beef liver, cooked", 191, 29, 5, 5, 85, ""],
  ["Beef tongue, cooked", 284, 22, 0, 21, 85, ""],
  ["Oxtail, cooked", 262, 30, 0, 15, 120, ""],
  ["Veal cutlet, cooked", 172, 31, 0, 4.5, 120, ""],
  ["Bison, cooked", 143, 28, 0, 2.4, 120, "buffalo"],
  ["Venison, cooked", 158, 30, 0, 3.2, 120, "deer"],
  ["Beef ribs, cooked", 312, 25, 0, 23, 150, ""],

  // --- Pork, all cuts ---
  ["Pork shoulder, cooked", 269, 24, 0, 19, 120, "pulled pork boston butt"],
  ["Pork loin roast, cooked", 209, 28, 0, 10, 120, ""],
  ["Pork belly, cooked", 518, 9, 0, 53, 85, ""],
  ["Canadian bacon", 145, 21, 1.4, 6, 45, "back bacon"],
  ["Pork rinds", 544, 61, 0, 31, 28, "chicharron"],
  ["Bratwurst", 333, 14, 3, 29, 85, ""],
  ["Italian sausage", 344, 19, 4, 28, 85, ""],
  ["Chorizo", 455, 24, 2, 38, 60, ""],
  ["Kielbasa", 309, 14, 3, 27, 85, "polish sausage"],
  ["Andouille sausage", 296, 17, 2, 24, 85, ""],
  ["Breakfast sausage patty", 325, 13, 1, 30, 45, ""],

  // --- Poultry, all parts ---
  ["Chicken drumstick, cooked", 172, 28, 0, 6, 75, ""],
  ["Chicken leg, cooked", 184, 26, 0, 8, 100, ""],
  ["Whole chicken, roasted", 239, 27, 0, 14, 120, ""],
  ["Chicken liver, cooked", 172, 25, 1, 7, 85, ""],
  ["Chicken tenders, cooked", 263, 18, 15, 14, 90, "chicken strips"],
  ["Turkey thigh, cooked", 179, 27, 0, 7, 100, ""],
  ["Turkey leg, cooked", 208, 28, 0, 10, 100, ""],
  ["Cornish hen, cooked", 259, 25, 0, 17, 120, ""],
  ["Goose, cooked", 305, 25, 0, 22, 120, ""],
  ["Quail, cooked", 234, 25, 0, 14, 85, ""],
  ["Chicken gizzard, cooked", 154, 30, 0, 3, 85, ""],

  // --- Lamb & game ---
  ["Leg of lamb, cooked", 258, 26, 0, 16, 120, ""],
  ["Lamb shoulder, cooked", 292, 24, 0, 21, 120, ""],
  ["Ground lamb, cooked", 283, 25, 0, 20, 100, "mince"],
  ["Rack of lamb, cooked", 320, 22, 0, 25, 120, ""],
  ["Rabbit, cooked", 173, 33, 0, 3.5, 120, ""],

  // --- Deli & cured ---
  ["Bologna", 308, 15, 3, 27, 30, ""],
  ["Pastrami", 147, 22, 1, 6, 60, ""],
  ["Roast beef, deli", 117, 19, 2, 3, 60, ""],
  ["Turkey, deli", 104, 17, 3, 2, 60, "deli turkey"],
  ["Liverwurst", 326, 14, 2, 28, 30, "braunschweiger"],
  ["Mortadella", 311, 16, 3, 25, 30, ""],

  // --- More fish & seafood ---
  ["Trout, cooked", 168, 24, 0, 7, 120, ""],
  ["Sea bass, cooked", 124, 23, 0, 2.6, 120, ""],
  ["Snapper, cooked", 128, 26, 0, 1.7, 120, "red snapper"],
  ["Flounder, cooked", 86, 18, 0, 1.1, 120, ""],
  ["Sole, cooked", 91, 18, 0, 1.2, 120, ""],
  ["Haddock, cooked", 90, 20, 0, 0.6, 120, ""],
  ["Herring, cooked", 217, 25, 0, 12, 100, ""],
  ["Swordfish, cooked", 172, 28, 0, 5.7, 120, ""],
  ["Pollock, cooked", 111, 23, 0, 1.2, 120, ""],
  ["Mahi mahi, cooked", 109, 24, 0, 0.9, 120, "dolphinfish"],
  ["Grouper, cooked", 118, 25, 0, 1.3, 120, ""],
  ["Oysters, cooked", 79, 9, 4.7, 2.3, 85, ""],
  ["Mussels, cooked", 172, 24, 7, 4.5, 85, ""],
  ["Clams, cooked", 148, 26, 5, 2, 85, ""],
  ["Squid, cooked", 175, 18, 8, 7, 85, "calamari"],
  ["Octopus, cooked", 164, 30, 4, 2, 85, ""],
  ["Crawfish, cooked", 82, 17, 0, 1.2, 85, "crayfish"],
  ["Imitation crab", 95, 8, 15, 0.4, 85, "surimi"],
  ["Fish sticks", 290, 13, 24, 15, 85, ""],
  ["Fish fillet, breaded", 232, 12, 18, 12, 100, ""],

  // --- More fruits ---
  ["Tangerine", 53, 0.8, 13, 0.3, 88, ""],
  ["Persimmon", 70, 0.6, 18, 0.2, 168, ""],
  ["Passion fruit", 97, 2.2, 23, 0.7, 18, ""],
  ["Lychee", 66, 0.8, 17, 0.4, 10, ""],
  ["Dragon fruit", 60, 1.2, 13, 0, 100, "pitaya"],
  ["Starfruit", 31, 1, 6.7, 0.3, 91, "carambola"],
  ["Plantain, cooked", 122, 0.8, 32, 0.2, 118, ""],
  ["Jackfruit", 95, 1.7, 23, 0.6, 165, ""],
  ["Mulberries", 43, 1.4, 10, 0.4, 140, "berries"],
  ["Rhubarb", 21, 0.9, 4.5, 0.2, 122, ""],
  ["Currants", 63, 1.4, 15, 0.2, 112, ""],
  ["Quince", 57, 0.4, 15, 0.1, 92, ""],
  ["Guava", 68, 2.6, 14, 1, 55, ""],
  ["Acai", 70, 1, 4, 5, 100, ""],
  ["Coconut meat, fresh", 354, 3.3, 15, 33, 45, ""],
  ["Dried cranberries", 308, 0.1, 82, 1.4, 40, "craisins"],
  ["Dried figs", 249, 3.3, 64, 0.9, 30, ""],

  // --- More vegetables ---
  ["Fennel", 31, 1.2, 7.3, 0.2, 87, ""],
  ["Endive", 17, 1.3, 3.4, 0.2, 50, ""],
  ["Watercress", 11, 2.3, 1.3, 0.1, 34, ""],
  ["Mustard greens", 27, 2.9, 4.7, 0.4, 56, ""],
  ["Kohlrabi", 27, 1.7, 6.2, 0.1, 135, ""],
  ["Rutabaga", 37, 1.1, 9, 0.2, 140, "swede"],
  ["Jicama", 38, 0.7, 9, 0.1, 120, ""],
  ["Water chestnuts", 97, 1.4, 24, 0.1, 70, ""],
  ["Bean sprouts", 31, 3, 6, 0.2, 100, "mung sprouts"],
  ["Bamboo shoots", 27, 2.6, 5.2, 0.3, 120, ""],
  ["Seaweed, nori", 35, 5.8, 5, 0.3, 10, "kelp"],
  ["Turnip greens", 32, 1.5, 7, 0.3, 55, ""],
  ["Napa cabbage", 16, 1.2, 3.2, 0.2, 75, ""],
  ["Radicchio", 23, 1.4, 4.5, 0.3, 40, ""],
  ["Green onion", 32, 1.8, 7.3, 0.2, 15, "scallion"],
  ["Shallot", 72, 2.5, 17, 0.1, 10, ""],
  ["Cassava", 160, 1.4, 38, 0.3, 100, "yuca"],
  ["Taro, cooked", 142, 0.5, 35, 0.1, 130, ""],
  ["Horseradish", 48, 1.2, 11, 0.7, 15, ""],
  ["Delicata squash, cooked", 40, 0.9, 10, 0.1, 140, ""],

  // --- More legumes, beans, lentils ---
  ["Cannellini beans, cooked", 126, 8, 23, 0.5, 177, "white beans"],
  ["Great northern beans, cooked", 118, 8.3, 21, 0.4, 177, ""],
  ["Fava beans, cooked", 110, 7.6, 20, 0.4, 170, "broad beans"],
  ["Mung beans, cooked", 105, 7, 19, 0.4, 170, ""],
  ["Adzuki beans, cooked", 128, 7.5, 25, 0.1, 170, ""],
  ["Cranberry beans, cooked", 136, 9.3, 25, 0.5, 177, "borlotti"],
  ["Red lentils, cooked", 120, 9, 20, 0.4, 198, "masoor dal"],
  ["Green lentils, cooked", 116, 9, 20, 0.4, 198, ""],
  ["Pigeon peas, cooked", 121, 6.8, 23, 0.4, 170, "toor dal"],
  ["Miso paste", 199, 12, 26, 6, 17, ""],
  ["Natto", 211, 19, 13, 11, 100, ""],
  ["Soy nuts", 471, 36, 34, 22, 28, "roasted soybeans"],

  // --- More seeds & nuts ---
  ["Sesame seeds", 573, 18, 23, 50, 15, ""],
  ["Hemp seeds", 553, 32, 9, 49, 30, "hemp hearts"],
  ["Poppy seeds", 525, 18, 28, 42, 15, ""],
  ["Pine nuts", 673, 14, 13, 68, 28, ""],
  ["Chestnuts, roasted", 245, 3.2, 53, 2.2, 40, ""],
  ["Cashew butter", 587, 18, 28, 49, 32, ""],

  // --- More grains ---
  ["Millet, cooked", 119, 3.5, 24, 1, 174, ""],
  ["Amaranth, cooked", 102, 3.8, 19, 1.6, 185, ""],
  ["Buckwheat, cooked", 92, 3.4, 20, 0.6, 168, "kasha"],
  ["Sorghum, cooked", 115, 3.6, 25, 0.5, 175, ""],
  ["Spelt, cooked", 127, 5.5, 26, 0.9, 174, ""],
  ["Polenta, cooked", 85, 2, 18, 0.4, 155, "cornmeal"],
  ["Wheat berries, cooked", 124, 4.8, 27, 0.6, 180, ""],

  // --- More dairy & eggs ---
  ["Buttermilk", 62, 3.3, 4.8, 3.3, 240, ""],
  ["Evaporated milk", 135, 6.8, 10, 7.6, 30, ""],
  ["Condensed milk, sweetened", 321, 7.9, 54, 8.7, 30, ""],
  ["Gelato", 216, 4, 30, 9, 88, ""],
  ["Sherbet", 144, 1.1, 31, 2, 100, ""],
  ["Queso fresco", 299, 18, 3, 24, 30, ""],
  ["Monterey jack cheese", 373, 24, 0.7, 30, 30, ""],
  ["Colby cheese", 394, 24, 2.6, 32, 30, ""],
  ["Brie cheese", 334, 21, 0.5, 28, 30, ""],
  ["Mascarpone", 429, 5, 4, 44, 30, ""],
  ["Paneer", 265, 18, 1.2, 21, 60, ""],
  ["Ghee", 900, 0, 0, 100, 14, "clarified butter"],
  ["Duck egg", 185, 13, 1.5, 14, 70, ""],
  ["Egg, boiled", 155, 13, 1.1, 11, 50, "hard boiled"],
];

/**
 * Core micronutrients per 100 g for common foods (§5B micro tracking). Values in
 * grams (OFF convention: sodium 0.5 = 500 mg), standard reference figures. Keyed
 * by the exact food name. Additive — foods absent here just carry macros until
 * their micros are filled in. Order per key: fiber, sugars, saturated-fat,
 * sodium, potassium, calcium, iron.
 */
type Micro = { fiber?: number; sugars?: number; "saturated-fat"?: number; sodium?: number; potassium?: number; calcium?: number; iron?: number };
const MICROS: Record<string, Micro> = {
  "Chicken breast, cooked": { sodium: 0.074, potassium: 0.256, iron: 0.001, "saturated-fat": 1 },
  "Salmon, cooked": { sodium: 0.059, potassium: 0.384, calcium: 0.012, iron: 0.0003, "saturated-fat": 3.1 },
  "Egg, whole": { sugars: 1.1, sodium: 0.124, potassium: 0.126, calcium: 0.05, iron: 0.0018, "saturated-fat": 3.3 },
  "White bread": { fiber: 2.7, sugars: 5, "saturated-fat": 0.7, sodium: 0.491, potassium: 0.1, calcium: 0.144, iron: 0.0036 },
  "Whole wheat bread": { fiber: 6, sugars: 6, "saturated-fat": 0.7, sodium: 0.45, potassium: 0.25, calcium: 0.107, iron: 0.0025 },
  "Rye bread": { fiber: 5.8, sugars: 3.9, "saturated-fat": 0.6, sodium: 0.603, potassium: 0.166, calcium: 0.073, iron: 0.0028 },
  "White rice, cooked": { fiber: 0.4, sugars: 0.1, "saturated-fat": 0.1, sodium: 0.001, potassium: 0.035, iron: 0.0014 },
  "Brown rice, cooked": { fiber: 1.6, "saturated-fat": 0.2, sodium: 0.004, potassium: 0.079, iron: 0.0005 },
  "Oats, dry": { fiber: 10, sugars: 1, "saturated-fat": 1.2, sodium: 0.002, potassium: 0.429, calcium: 0.054, iron: 0.0047 },
  "Banana": { fiber: 2.6, sugars: 12, sodium: 0.001, potassium: 0.358, calcium: 0.005, iron: 0.0003 },
  "Apple": { fiber: 2.4, sugars: 10, sodium: 0.001, potassium: 0.107, calcium: 0.006 },
  "Broccoli": { fiber: 2.6, sugars: 1.7, sodium: 0.033, potassium: 0.316, calcium: 0.047, iron: 0.0007 },
  "Spinach": { fiber: 2.2, sugars: 0.4, sodium: 0.079, potassium: 0.558, calcium: 0.099, iron: 0.0027 },
  "Sweet potato, cooked": { fiber: 3.3, sugars: 6.5, sodium: 0.036, potassium: 0.475, calcium: 0.038, iron: 0.0007 },
  "Potato, cooked": { fiber: 1.8, sugars: 0.9, sodium: 0.005, potassium: 0.379, calcium: 0.005, iron: 0.0031 },
  "Almonds": { fiber: 12.5, sugars: 4.4, "saturated-fat": 3.8, sodium: 0.001, potassium: 0.733, calcium: 0.269, iron: 0.0037 },
  "Peanut butter": { fiber: 6, sugars: 9, "saturated-fat": 10, sodium: 0.476, potassium: 0.649, calcium: 0.049, iron: 0.0019 },
  "Greek yogurt, plain nonfat": { sugars: 3.6, sodium: 0.036, potassium: 0.141, calcium: 0.11, "saturated-fat": 0.1 },
  "Milk, whole": { sugars: 4.8, "saturated-fat": 1.9, sodium: 0.043, potassium: 0.132, calcium: 0.113 },
  "Cheddar cheese": { sugars: 0.5, "saturated-fat": 19, sodium: 0.621, potassium: 0.098, calcium: 0.721, iron: 0.0007 },
  "Black beans, cooked": { fiber: 8.7, sugars: 0.3, sodium: 0.001, potassium: 0.355, calcium: 0.027, iron: 0.0021 },
  "Lentils, cooked": { fiber: 7.9, sugars: 1.8, sodium: 0.002, potassium: 0.369, calcium: 0.019, iron: 0.0033 },
  "Chickpeas, cooked": { fiber: 7.6, sugars: 4.8, "saturated-fat": 0.3, sodium: 0.007, potassium: 0.291, calcium: 0.049, iron: 0.0029 },
  "Avocado": { fiber: 6.7, sugars: 0.7, "saturated-fat": 2.1, sodium: 0.007, potassium: 0.485, calcium: 0.012, iron: 0.0006 },
  "Ground beef 90/10, cooked": { sodium: 0.072, potassium: 0.318, iron: 0.0026, "saturated-fat": 3.2 },
  "Tuna, canned in water": { sodium: 0.247, potassium: 0.237, iron: 0.0013, "saturated-fat": 0.3 },
  "Carrots": { fiber: 2.8, sugars: 4.7, sodium: 0.069, potassium: 0.32, calcium: 0.033, iron: 0.0003 },
  "Orange": { fiber: 2.4, sugars: 9, sodium: 0, potassium: 0.181, calcium: 0.04 },
  "Blueberries": { fiber: 2.4, sugars: 10, sodium: 0.001, potassium: 0.077, calcium: 0.006 },
  "Quinoa, cooked": { fiber: 2.8, sugars: 0.9, "saturated-fat": 0.2, sodium: 0.007, potassium: 0.172, iron: 0.0015 },
  "Pasta, cooked": { fiber: 1.8, sugars: 0.6, sodium: 0.001, potassium: 0.044, iron: 0.0005 },
  "Tofu, firm": { fiber: 0.9, "saturated-fat": 1.3, sodium: 0.012, potassium: 0.121, calcium: 0.35, iron: 0.0027 },
};

/** Turn one reference row into the same NormalizedFood shape as an OFF result. */
function toNormalized(row: Row): NormalizedFood {
  const [name, kcal, protein, carbs, fat, servingG] = row;
  const nutrimentsPer100g: Record<string, number> = {
    energy_kcal: kcal,
    proteins: protein,
    carbohydrates: carbs,
    fat,
  };
  const micros = MICROS[name];
  if (micros) {
    for (const [k, v] of Object.entries(micros)) {
      if (typeof v === "number") nutrimentsPer100g[k] = v;
    }
  }
  return {
    barcode: "", // generics have no barcode; logs store null
    name,
    brand: "Generic",
    imageUrl: null,
    servingSizeG: servingG,
    per100g: { calories: kcal, proteinG: protein, carbsG: carbs, fatG: fat },
    nutrimentsPer100g,
    missing: [],
  };
}

/** Levenshtein edit distance (bounded use, so the simple O(mn) version is fine). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * How strongly does query word `w` hit the target words?
 *   20 = exact word · 14 = solid substring · 7 = near-typo · 0 = no match.
 * Exact matches dominate so a two-exact-word hit always beats fuzzy noise.
 */
function wordHit(w: string, targets: string[]): number {
  if (targets.some((t) => t === w)) return 20;
  if (w.length >= 3 && targets.some((t) => t.includes(w) || (t.length >= 4 && w.includes(t)))) {
    return 14;
  }
  if (w.length >= 4) {
    const tol = w.length >= 5 ? 2 : 1;
    // Fuzzy only against real words (len >= 4) to avoid matching tiny tokens.
    const near = targets.some(
      (t) => t.length >= 4 && Math.abs(t.length - w.length) <= tol && editDistance(w, t) <= tol,
    );
    if (near) return 7;
  }
  return 0;
}

/**
 * Rank a food against the query. Case-insensitive and typo-tolerant, so
 * "White Bread", "chikn breast", and "rye slice" all resolve — while keeping
 * distinct varieties (rye vs whole wheat vs white) separate. Higher is better.
 */
function score(name: string, keywords: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(q)) return 75;

  const queryWords = tokenize(q);
  if (queryWords.length === 0) return 0;
  const targets = [...tokenize(name), ...tokenize(keywords)];

  let sum = 0;
  let matched = 0;
  for (const w of queryWords) {
    const hit = wordHit(w, targets);
    if (hit > 0) {
      sum += hit;
      matched++;
    }
  }
  if (matched === 0) return 0;
  if (matched === queryWords.length) sum += 15; // bonus when every word lands
  return sum;
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

/** All generic food names — used to assert the catalog has no duplicates. */
export function allGenericFoodNames(): string[] {
  return FOODS.map((r) => r[0]);
}
