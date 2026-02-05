import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, type, deliveryPersonId } = await req.json();

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', Deno.env.get('RAZORPAY_KEY_SECRET'))
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return Response.json({ error: 'Invalid signature', verified: false }, { status: 400 });
    }

    if (type === 'delivery' && deliveryPersonId) {
      const persons = await base44.asServiceRole.entities.DeliveryPerson.filter({ id: deliveryPersonId });
      if (persons.length > 0) {
        const person = persons[0];
        const newBalance = (person.account_balance || 0) + amount;
        
        await base44.asServiceRole.entities.DeliveryPerson.update(deliveryPersonId, {
          account_balance: newBalance
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: person.email,
          title: 'Wallet Recharged!',
          message: `₹${amount.toFixed(2)} added to your wallet. New balance: ₹${newBalance.toFixed(2)}`,
          type: 'success'
        });
      }
    } else if (type === 'user') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized', verified: false }, { status: 401 });
      }
      
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      if (users.length > 0) {
        const currentUser = users[0];
        const newBalance = (currentUser.wallet_balance || 0) + amount;
        
        await base44.asServiceRole.entities.User.update(user.id, {
          wallet_balance: newBalance
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: user.id,
          title: 'Wallet Recharged!',
          message: `₹${amount.toFixed(2)} added to your wallet. New balance: ₹${newBalance.toFixed(2)}`,
          type: 'success'
        });
      }
    }

    return Response.json({
      success: true,
      verified: true
    });
  } catch (error) {
    console.error('Error verifying wallet recharge:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});