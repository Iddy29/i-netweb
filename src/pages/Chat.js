import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiPaperAirplane, HiChatAlt2, HiUser, HiSparkles } from 'react-icons/hi';

const QUICK_REPLIES = [
  'How do I place an order?',
  'What payment methods do you accept?',
  'How long does delivery take?',
  'I need help with my order',
];

// Simple AI response (can be replaced with actual API)
function getAIResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('order') && msg.includes('place'))
    return 'To place an order, go to the Home page, browse our services, click on one to see details, then click "Order Now" to proceed with payment.';
  if (msg.includes('payment') || msg.includes('pay'))
    return 'We support USSD Push (mobile money) and Manual Payment methods. USSD Push sends a payment prompt directly to your phone. For manual payment, you send money to the provided number and upload the confirmation message.';
  if (msg.includes('delivery') || msg.includes('long'))
    return 'Most orders are processed within minutes after payment confirmation. You\'ll receive your account credentials in the Orders page once ready.';
  if (msg.includes('help') || msg.includes('support'))
    return 'I\'m here to help! You can describe your issue and I\'ll do my best to assist. For urgent matters, please contact our support team directly.';
  if (msg.includes('refund') || msg.includes('cancel'))
    return 'For refund or cancellation requests, please contact our support team. We process refunds on a case-by-case basis within 24-48 hours.';
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey'))
    return 'Hello! Welcome to i-net support. How can I help you today?';
  return 'Thank you for your message. I can help with order placement, payment methods, delivery times, and general inquiries. Could you provide more details about what you need?';
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hi ${user?.fullName?.split(' ')[0] || 'there'}! I'm your i-net support assistant. How can I help you today?`,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: text.trim(), time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

    const reply = getAIResponse(text);
    setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply, time: new Date() }]);
    setTyping(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="chat-page">
      <h1><HiChatAlt2 size={24} /> Support Chat</h1>

      <div className="chat-container">
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="chat-avatar">
                {msg.sender === 'ai' ? <HiSparkles size={16} /> : <HiUser size={16} />}
              </div>
              <div className="chat-content">
                <p>{msg.text}</p>
                <span className="chat-time">
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {typing && (
            <div className="chat-bubble ai">
              <div className="chat-avatar"><HiSparkles size={16} /></div>
              <div className="chat-content typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        {messages.length <= 1 && (
          <div className="quick-replies">
            {QUICK_REPLIES.map((q) => (
              <button key={q} className="quick-reply-btn" onClick={() => sendMessage(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim()}>
            <HiPaperAirplane size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
