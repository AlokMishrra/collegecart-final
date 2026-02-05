import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!appId || !secretKey) {
      console.error('Cashfree credentials missing');
      return Response.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    console.log('Verifying Cashfree payment for order:', orderId);

    // Fetch order details from Cashfree
    const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Cashfree verification response:', responseText);

    if (!response.ok) {
      console.error('Cashfree verification error:', responseText);
      return Response.json({ 
        success: false,
        error: 'Payment verification failed'
      }, { status: 400 });
    }

    const orderDetails = JSON.parse(responseText);
    console.log('Order status:', orderDetails.order_status);

    // Check if payment is successful
    if (orderDetails.order_status === 'PAID') {
      console.log('Payment verified successfully:', orderId);
      return Response.json({
        success: true,
        message: 'Payment verified successfully',
        orderId: orderId,
        paymentStatus: orderDetails.order_status
      }, { status: 200 });
    } else {
      console.log('Payment not completed:', orderDetails.order_status);
      return Response.json({
        success: false,
        error: 'Payment not completed',
        paymentStatus: orderDetails.order_status
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error verifying payment:', error.message, error.stack);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});