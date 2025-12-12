import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerSupportChatbot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: `Hello${user?.full_name ? ` ${user.full_name}` : ''}! 👋 I'm your CollegeCart AI assistant. I can help you with:

• Product information and recommendations
• Order status and tracking
• Loyalty points and rewards
• Delivery information
• General queries

How can I assist you today?`
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getContextForAI = async () => {
    const context = {
      user_info: user ? {
        name: user.full_name,
        email: user.email,
        hostel: user.selected_hostel,
        tier: user.loyalty_tier || "Bronze"
      } : null
    };

    if (user) {
      try {
        // Get user orders
        const orders = await base44.entities.Order.filter({ user_id: user.id }, '-created_date', 5);
        context.recent_orders = orders.map(o => ({
          order_number: o.order_number,
          status: o.status,
          total: o.total_amount,
          date: o.created_date
        }));

        // Get loyalty points
        const loyaltyTxns = await base44.entities.LoyaltyTransaction.filter({ user_id: user.id });
        const points = loyaltyTxns.reduce((sum, t) => sum + t.points, 0);
        context.loyalty_points = points;

        // Get active campaigns
        const campaigns = await base44.entities.Campaign.filter({ is_active: true });
        context.active_campaigns = campaigns.map(c => ({
          name: c.name,
          code: c.code,
          discount: c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`
        }));
      } catch (error) {
        console.error("Error fetching context:", error);
      }
    }

    // Get some product info
    try {
      const products = await base44.entities.Product.filter({ is_available: true }, '-created_date', 10);
      context.featured_products = products.map(p => ({
        name: p.name,
        price: p.price,
        category: p.category_id
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
    }

    return context;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const context = await getContextForAI();
      
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      const prompt = `You are a helpful customer support assistant for CollegeCart, a grocery delivery service for college students.

Context:
${JSON.stringify(context, null, 2)}

Conversation History:
${JSON.stringify(conversationHistory, null, 2)}

User Question: ${inputMessage}

Instructions:
- Be friendly, helpful, and concise
- Use the context provided to give accurate information
- If asked about orders, use the order numbers and status from context
- If asked about loyalty points, use the exact balance
- Recommend products when relevant
- Mention active campaigns/discounts when appropriate
- If you don't have information, suggest contacting support
- Use emojis sparingly to be friendly

Respond naturally and helpfully:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const botMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: "I'm sorry, I'm having trouble responding right now. Please try again or contact our support team."
      }]);
    }

    setIsTyping(false);
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
              size="icon"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
          >
            <Card className="shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">AI Assistant</CardTitle>
                      <Badge className="bg-emerald-500 text-xs">Online</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-emerald-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isTyping ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}