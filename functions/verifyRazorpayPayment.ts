import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: 'Missing payment details' }, { status: 400 });
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_SECRET) {
      return Response.json({ error: 'Razorpay secret not configured' }, { status: 500 });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const messageData = encoder.encode(text);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      return Response.json({ 
        error: 'Invalid signature',
        verified: false 
      }, { status: 400 });
    }

    // Fetch payment details from Razorpay
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!paymentResponse.ok) {
      return Response.json({ error: 'Failed to fetch payment details' }, { status: 500 });
    }

    const paymentData = await paymentResponse.json();

    return Response.json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: paymentData.status,
      method: paymentData.method,
      amount: paymentData.amount / 100, // Convert from paise to rupees
      email: paymentData.email,
      contact: paymentData.contact
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});