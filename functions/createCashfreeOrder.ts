import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, amount, customerName, customerPhone, customerEmail } = await req.json();

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!appId || !secretKey) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    // Create Cashfree order
    const cashfreeOrderId = `order_${Date.now()}_${orderId}`;
    const cashfreeOrder = {
      order_id: cashfreeOrderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: customerName,
        customer_email: customerEmail || 'noreply@collegecart.com',
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: `${new URL(req.url).origin}?cashfree_payment=success&order_id=${orderId}`,
        notify_url: `${new URL(req.url).origin}/api/verifyCashfreePayment`
      }
    };

    // Call Cashfree API (Production: https://api.cashfree.com, Test: https://sandbox.cashfree.com)
    const cashfreeResponse = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(cashfreeOrder)
    });

    if (!cashfreeResponse.ok) {
      const errorText = await cashfreeResponse.text();
      console.error('Cashfree API error:', errorText);
      return Response.json({ error: 'Failed to create Cashfree order' }, { status: 500 });
    }

    const cashfreeData = await cashfreeResponse.json();

    return Response.json({
      success: true,
      payment_session_id: cashfreeData.payment_session_id,
      order_id: cashfreeData.order_id,
      payment_link: cashfreeData.payment_link
    });

  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});