import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, orderNumber, customerName, customerPhone, customerEmail } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!appId || !secretKey) {
      console.error('Cashfree credentials missing');
      return Response.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Create Cashfree order
    const orderData = {
      order_id: orderNumber || `order_${Date.now()}`,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: customerName || user.full_name || 'Customer',
        customer_email: customerEmail || user.email || 'customer@collegecart.com',
        customer_phone: customerPhone || '9999999999'
      },
      order_meta: {
        return_url: `https://collegecart.base44.app/Orders?order_id=${orderNumber}`
      }
    };

    console.log('Creating Cashfree order:', orderData);

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const responseText = await response.text();
    console.log('Cashfree API Response:', responseText);

    if (!response.ok) {
      console.error('Cashfree API Error:', responseText);
      return Response.json({ 
        error: 'Failed to create payment order',
        details: responseText 
      }, { status: 500 });
    }

    const order = JSON.parse(responseText);
    console.log('Cashfree order created successfully:', order.order_id);

    return Response.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      orderAmount: order.order_amount,
      orderCurrency: order.order_currency
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating Cashfree order:', error.message, error.stack);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});