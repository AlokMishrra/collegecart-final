import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, courier_name = "Local Delivery" } = await req.json();

    // Get order details
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Generate tracking number (in production, this would come from shipping API)
    const trackingNumber = `CC${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Update order with tracking info
    await base44.asServiceRole.entities.Order.update(order_id, {
      tracking_number: trackingNumber,
      courier_name: courier_name,
      shipping_label_generated: true
    });

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      user_id: order.user_id,
      title: "Shipping Label Generated",
      message: `Your order ${order.order_number} has been assigned tracking number: ${trackingNumber}`,
      type: "info"
    });

    // Generate mock shipping label data (in production, integrate with Shiprocket/Delhivery API)
    const labelData = {
      tracking_number: trackingNumber,
      courier_name: courier_name,
      order_number: order.order_number,
      customer_name: order.customer_name,
      delivery_address: order.delivery_address,
      phone_number: order.phone_number,
      weight: "1 kg",
      label_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${trackingNumber}`
    };

    return Response.json({ 
      success: true, 
      tracking_number: trackingNumber,
      label_data: labelData
    });

  } catch (error) {
    console.error("Error generating shipping label:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});