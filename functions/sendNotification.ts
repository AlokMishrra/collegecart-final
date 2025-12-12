import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_type, title, message, data } = await req.json();

    // Get notification config for this event
    const configs = await base44.asServiceRole.entities.NotificationConfig.filter({ 
      event_type 
    });

    if (configs.length === 0) {
      return Response.json({ 
        success: true, 
        message: "No configuration found for this event" 
      });
    }

    const config = configs[0];
    const results = [];

    // Send in-app notifications
    if (config.in_app_enabled && data?.user_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: data.user_id,
        title,
        message,
        type: data?.type || "info"
      });
      results.push({ channel: "in-app", status: "sent" });
    }

    // Send email notifications
    if (config.email_enabled && config.recipients?.length > 0) {
      for (const email of config.recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: title,
            body: message
          });
          results.push({ channel: "email", recipient: email, status: "sent" });
        } catch (error) {
          results.push({ 
            channel: "email", 
            recipient: email, 
            status: "failed", 
            error: error.message 
          });
        }
      }
    }

    // SMS would require additional integration setup
    if (config.sms_enabled) {
      results.push({ 
        channel: "sms", 
        status: "skipped", 
        message: "SMS integration not configured" 
      });
    }

    return Response.json({ 
      success: true, 
      results 
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});