import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, User } from "lucide-react";

export default function InAppChat({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadUsers();
      const interval = setInterval(loadConversations, 3000); // Poll every 3s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      const interval = setInterval(() => loadMessages(selectedConversation), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUsers = async () => {
    const allUsers = await base44.entities.User.list();
    setUsers(allUsers.filter(u => u.id !== currentUser.id));
  };

  const loadConversations = async () => {
    const sent = await base44.entities.ChatMessage.filter({ sender_id: currentUser.id });
    const received = await base44.entities.ChatMessage.filter({ receiver_id: currentUser.id });
    
    const allMessages = [...sent, ...received];
    const convIds = [...new Set(allMessages.map(m => m.conversation_id))];
    
    const convs = convIds.map(convId => {
      const convMessages = allMessages.filter(m => m.conversation_id === convId);
      const lastMessage = convMessages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      const otherId = lastMessage.sender_id === currentUser.id ? lastMessage.receiver_id : lastMessage.sender_id;
      const unread = convMessages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
      return { convId, lastMessage, otherId, unread };
    });

    setConversations(convs.sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)));
    setUnreadCount(convs.reduce((sum, c) => sum + c.unread, 0));
  };

  const loadMessages = async (convId) => {
    const msgs = await base44.entities.ChatMessage.filter({ conversation_id: convId }, 'created_date');
    setMessages(msgs);
    
    // Mark as read
    for (const msg of msgs) {
      if (msg.receiver_id === currentUser.id && !msg.is_read) {
        await base44.entities.ChatMessage.update(msg.id, { is_read: true });
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    await base44.entities.ChatMessage.create({
      sender_id: currentUser.id,
      receiver_id: conversations.find(c => c.convId === selectedConversation).otherId,
      message: newMessage,
      conversation_id: selectedConversation
    });
    
    setNewMessage("");
    loadMessages(selectedConversation);
  };

  const startConversation = async (userId) => {
    const convId = [currentUser.id, userId].sort().join("_");
    setSelectedConversation(convId);
    loadMessages(convId);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "User";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List */}
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-3 border-b">
              <p className="text-sm font-semibold mb-2">Start New Chat</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {users.map(user => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => startConversation(user.id)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.full_name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              {conversations.map(conv => (
                <div
                  key={conv.convId}
                  onClick={() => setSelectedConversation(conv.convId)}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    selectedConversation === conv.convId ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{getUserName(conv.otherId)}</p>
                    {conv.unread > 0 && (
                      <Badge className="bg-emerald-600 text-white text-xs">{conv.unread}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{conv.lastMessage.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender_id === currentUser.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                  />
                  <Button onClick={sendMessage} className="bg-emerald-600 hover:bg-emerald-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}