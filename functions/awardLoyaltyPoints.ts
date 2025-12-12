import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is meant to be called when an order is delivered
    const { orderId } = await req.json();
    
    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get order details
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return Response.json({ error: 'Order must be delivered to award points' }, { status: 400 });
    }

    // Check if points already awarded
    const existingTransactions = await base44.asServiceRole.entities.LoyaltyTransaction.filter({
      order_id: orderId,
      transaction_type: 'earned'
    });

    if (existingTransactions.length > 0) {
      return Response.json({ message: 'Points already awarded for this order' });
    }

    // Calculate points: 10 points per ₹100 spent
    const pointsEarned = Math.floor(order.total_amount / 10);

    if (pointsEarned > 0) {
      // Get current balance
      const allTransactions = await base44.asServiceRole.entities.LoyaltyTransaction.filter({
        user_id: order.user_id
      });
      const currentBalance = allTransactions.reduce((sum, t) => sum + t.points, 0);

      // Award points
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_id: order.user_id,
        points: pointsEarned,
        transaction_type: 'earned',
        order_id: orderId,
        description: `Earned ${pointsEarned} points from order ${order.order_number}`,
        balance_after: currentBalance + pointsEarned
      });

      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: order.user_id,
        title: '🎉 Loyalty Points Earned!',
        message: `You earned ${pointsEarned} points from your recent order. Keep shopping to earn more rewards!`,
        type: 'success'
      });

      return Response.json({
        success: true,
        pointsEarned,
        newBalance: currentBalance + pointsEarned
      });
    }

    return Response.json({ message: 'Order amount too low to earn points' });

  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});