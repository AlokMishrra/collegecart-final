import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Razorpay from 'npm:razorpay@2.9.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, type, deliveryPersonId } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID'),
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET')
    });

    const orderOptions = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `wallet_${type}_${Date.now()}`,
      notes: {
        type: type, // 'user' or 'delivery'
        user_id: user.id,
        delivery_person_id: deliveryPersonId || null
      }
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    return Response.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: Deno.env.get('RAZORPAY_KEY_ID')
    });
  } catch (error) {
    console.error('Error creating wallet recharge:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});