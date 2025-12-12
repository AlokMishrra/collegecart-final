import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all products
    const products = await base44.asServiceRole.entities.Product.list();
    
    const reviewerNames = [
      "Rahul Kumar", "Priya Sharma", "Amit Patel", "Neha Singh", "Vikram Verma",
      "Anjali Gupta", "Rohan Mehta", "Sneha Reddy", "Arjun Nair", "Pooja Desai",
      "Karan Joshi", "Riya Iyer", "Siddharth Rao", "Divya Kapoor", "Aditya Shah",
      "Meera Bhat", "Harsh Kulkarni", "Tanya Malhotra", "Varun Menon", "Sakshi Agarwal",
      "Nikhil Pandey", "Ishita Saxena", "Abhishek Jain", "Kavya Pillai", "Manish Shetty"
    ];
    
    const comments = [
      "Excellent quality! Highly recommend.",
      "Very fresh and good packaging.",
      "Great value for money.",
      "Quick delivery and product was perfect.",
      "Good quality but slightly expensive.",
      "Fresh products, will order again!",
      "Satisfied with the purchase.",
      "Best quality I've found so far.",
      "Delivery was fast and product quality is top-notch.",
      "Good experience overall.",
      "Product matches the description perfectly.",
      "Very happy with my order!",
      "Could be better but decent quality.",
      "Excellent service and fresh products.",
      "Will definitely buy again.",
      "Good product at reasonable price.",
      "Fast delivery, fresh items.",
      "Quality exceeded my expectations.",
      "Packaging was excellent.",
      "Great shopping experience!",
      "Product quality is amazing.",
      "Highly satisfied customer here.",
      "Fresh and well-packaged.",
      "Best prices in town!",
      "Superb quality products."
    ];
    
    let reviewsCreated = 0;
    
    for (const product of products) {
      // Generate 45 reviews per product
      const reviewsToCreate = [];
      for (let i = 0; i < 45; i++) {
        const rating = i < 30 ? 5 : (i < 40 ? 4 : 3); // Most reviews are 5 stars
        const randomName = reviewerNames[Math.floor(Math.random() * reviewerNames.length)];
        const randomComment = comments[Math.floor(Math.random() * comments.length)];
        
        reviewsToCreate.push({
          product_id: product.id,
          user_id: "system",
          user_name: randomName,
          rating: rating,
          comment: randomComment
        });
      }
      
      // Bulk create all reviews for this product
      await base44.asServiceRole.entities.Review.bulkCreate(reviewsToCreate);
      reviewsCreated += reviewsToCreate.length;
    }
    
    return Response.json({
      success: true,
      message: `Generated ${reviewsCreated} reviews for ${products.length} products`
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});