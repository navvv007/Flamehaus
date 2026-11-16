export const categories = [
  { id: 1, name: "Burgers", icon: "🍔", color: "#FF6B35" },
  { id: 2, name: "Pizza", icon: "🍕", color: "#E63946" },
  { id: 3, name: "Sushi", icon: "🍣", color: "#2A9D8F" },
  { id: 4, name: "Pasta", icon: "🍝", color: "#E9C46A" },
  { id: 5, name: "Salads", icon: "🥗", color: "#57CC99" },
  { id: 6, name: "Desserts", icon: "🍰", color: "#C77DFF" },
  { id: 7, name: "Drinks", icon: "🥤", color: "#4CC9F0" },
  { id: 8, name: "Tacos", icon: "🌮", color: "#F4A261" },
];

export const menuItems = [
  { id: 1, name: "Classic Smash Burger", category: "Burgers", price: 12.99, rating: 4.8, reviews: 320, description: "Double smash patty, aged cheddar, caramelised onions, secret sauce", badge: "Best Seller", available: true, image: "🍔", prepTime: "12 min" },
  { id: 2, name: "BBQ Bacon Stack", category: "Burgers", price: 14.99, rating: 4.7, reviews: 210, description: "Triple stack, crispy bacon, BBQ glaze, jalapeños, coleslaw", badge: "Spicy", available: true, image: "🥓", prepTime: "15 min" },
  { id: 3, name: "Margherita Royale", category: "Pizza", price: 13.99, rating: 4.9, reviews: 480, description: "San Marzano tomatoes, buffalo mozzarella, fresh basil, EVOO", badge: "Chef's Pick", available: true, image: "🍕", prepTime: "18 min" },
  { id: 4, name: "Truffle Mushroom Pizza", category: "Pizza", price: 17.99, rating: 4.8, reviews: 195, description: "Black truffle oil, wild mushrooms, fontina, thyme", badge: "Premium", available: true, image: "🍄", prepTime: "20 min" },
  { id: 5, name: "Dragon Roll", category: "Sushi", price: 18.99, rating: 4.9, reviews: 267, description: "Shrimp tempura, cucumber, avocado, spicy mayo, tobiko", badge: "Fan Fav", available: true, image: "🍣", prepTime: "20 min" },
  { id: 6, name: "Rainbow Platter", category: "Sushi", price: 24.99, rating: 4.8, reviews: 189, description: "8-piece assorted nigiri with chef's seasonal selection", badge: "Premium", available: true, image: "🐟", prepTime: "25 min" },
  { id: 7, name: "Carbonara Classica", category: "Pasta", price: 15.99, rating: 4.7, reviews: 312, description: "Guanciale, pecorino romano, egg yolk, black pepper", badge: "Best Seller", available: true, image: "🍝", prepTime: "16 min" },
  { id: 8, name: "Lobster Linguine", category: "Pasta", price: 28.99, rating: 4.9, reviews: 145, description: "Fresh lobster, cherry tomatoes, garlic, white wine, parsley", badge: "Premium", available: true, image: "🦞", prepTime: "25 min" },
  { id: 9, name: "Mediterranean Bowl", category: "Salads", price: 11.99, rating: 4.6, reviews: 230, description: "Quinoa, falafel, hummus, roasted veg, lemon tahini dressing", badge: "Vegan", available: true, image: "🥗", prepTime: "10 min" },
  { id: 10, name: "Tiramisu", category: "Desserts", price: 7.99, rating: 4.9, reviews: 410, description: "Savoiardi, mascarpone cream, espresso, cocoa dusting", badge: "Best Seller", available: true, image: "🍰", prepTime: "5 min" },
  { id: 11, name: "Mango Lassi", category: "Drinks", price: 5.99, rating: 4.7, reviews: 290, description: "Fresh Alphonso mango, yoghurt, cardamom, rose water", badge: "Refreshing", available: true, image: "🥭", prepTime: "5 min" },
  { id: 12, name: "Fish Tacos", category: "Tacos", price: 13.99, rating: 4.7, reviews: 178, description: "Battered cod, mango salsa, chipotle crema, pickled cabbage", badge: "New", available: true, image: "🌮", prepTime: "14 min" },
];

export const orders = [
  { id: "ORD-001", customer: "Ravi Sharma", items: ["Classic Smash Burger", "Mango Lassi"], total: 18.98, status: "Delivered", date: "2025-06-25", time: "19:32" },
  { id: "ORD-002", customer: "Priya Mehta", items: ["Dragon Roll", "Rainbow Platter"], total: 43.98, status: "Preparing", date: "2025-06-27", time: "20:15" },
  { id: "ORD-003", customer: "Arjun Patel", items: ["Margherita Royale", "Tiramisu"], total: 21.98, status: "On the Way", date: "2025-06-27", time: "20:42" },
  { id: "ORD-004", customer: "Sneha Rao", items: ["Carbonara Classica"], total: 15.99, status: "Pending", date: "2025-06-27", time: "20:58" },
  { id: "ORD-005", customer: "Kiran Nair", items: ["BBQ Bacon Stack", "Fish Tacos"], total: 28.98, status: "Delivered", date: "2025-06-26", time: "13:20" },
  { id: "ORD-006", customer: "Divya Krishnan", items: ["Lobster Linguine"], total: 28.99, status: "Delivered", date: "2025-06-26", time: "14:05" },
];

export const salesData = [
  { month: "Jan", revenue: 42000, orders: 320 },
  { month: "Feb", revenue: 38000, orders: 295 },
  { month: "Mar", revenue: 51000, orders: 410 },
  { month: "Apr", revenue: 47000, orders: 375 },
  { month: "May", revenue: 62000, orders: 495 },
  { month: "Jun", revenue: 58000, orders: 460 },
];

export const reviews = [
  { id: 1, name: "Ananya S.", rating: 5, text: "Absolutely phenomenal! The Dragon Roll was the best I've had outside Japan. Super fast delivery too.", dish: "Dragon Roll", date: "2 days ago", avatar: "A" },
  { id: 2, name: "Rohan M.", rating: 5, text: "The Smash Burger changed my life. Crispy edges, juicy inside, perfect bun-to-meat ratio. Will order weekly.", dish: "Classic Smash Burger", date: "4 days ago", avatar: "R" },
  { id: 3, name: "Kavya T.", rating: 5, text: "Tiramisu tasted like it was made by an Italian nonna. Rich, creamy, perfectly balanced. Highly recommend!", dish: "Tiramisu", date: "1 week ago", avatar: "K" },
  { id: 4, name: "Mithun L.", rating: 4, text: "Lobster Linguine was outstanding. Fresh pasta, generous lobster portions. Slightly pricey but totally worth it.", dish: "Lobster Linguine", date: "1 week ago", avatar: "M" },
];
