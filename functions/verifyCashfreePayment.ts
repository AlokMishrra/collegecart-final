import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { orderId } = await req.json();

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!appId || !secretKey) {
      return Response.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    // Verify payment with Cashfree
    const verifyResponse = await fetch(`https://sandbox.cashfree.com/pg/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      }
    });

    if (!verifyResponse.ok) {
      return Response.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const paymentData = await verifyResponse.json();

    if (paymentData.order_status === 'PAID') {
      return Response.json({
        success: true,
        verified: true,
        payment_data: paymentData
      });
    } else {
      return Response.json({
        success: false,
        verified: false,
        status: paymentData.order_status
      });
    }

  } catch (error) {
    console.error('Error verifying Cashfree payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});