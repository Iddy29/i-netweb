import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiPaperAirplane, HiChatAlt2, HiUser, HiSparkles } from 'react-icons/hi';

const QUICK_REPLIES = [
  'How do I place an order?',
  'What payment methods do you accept?',
  'How do I subscribe to live TV?',
  'I need help with my payment',
  'How do promo codes work?',
  'Tell me about 18+ content',
];

// Newell AI — comprehensive knowledge-based response engine
function getNewellResponse(message, history = []) {
  const msg = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|habari|mambo|salama|hujambo)/.test(msg)) {
    return "Hello! 👋 I'm Newell, your i-net support assistant. I can help you with:\n\n• Services & ordering\n• Payments (USSD & Manual)\n• Live TV channel subscriptions\n• Promo codes & discounts\n• 18+ premium content\n• Account & profile settings\n\nWhat would you like help with?";
  }

  // Thank you
  if (/^(thanks|thank you|asante|shukran)/.test(msg)) {
    return "You're welcome! 😊 If you need anything else, feel free to ask. I'm here to help!";
  }

  // === ORDERING ===
  if ((msg.includes('order') && (msg.includes('place') || msg.includes('how'))) || msg.includes('buy service') || msg.includes('purchase')) {
    return "To place an order:\n\n1. Go to the **Home** page and browse services\n2. Click on a service to see details and features\n3. Click **\"Order Now\"** to proceed\n4. Choose your payment method (USSD Push or Manual)\n5. Complete the payment\n\nYour order will appear in **My Orders** once placed. You'll receive credentials once the order is processed.";
  }

  if (msg.includes('order') && (msg.includes('status') || msg.includes('track') || msg.includes('where'))) {
    return "You can track your orders in the **My Orders** page. Order statuses include:\n\n• **Pending** — Order placed, awaiting payment\n• **Processing** — Payment confirmed, being set up\n• **Active/Delivered** — Ready! Check for credentials\n• **Cancelled/Expired** — Contact support if unexpected\n\nYou'll also receive notifications when your order status changes.";
  }

  if (msg.includes('credential') || msg.includes('login detail') || msg.includes('username') || msg.includes('password')) {
    return "Once your order is processed and active, your service credentials (username/password) will be visible in the **My Orders** page. Click on the order to expand it and see the credentials section.\n\nIf credentials aren't showing for an active order, please wait a few minutes — the admin may still be setting them up.";
  }

  // === PAYMENTS ===
  if (msg.includes('payment method') || (msg.includes('pay') && msg.includes('method')) || (msg.includes('how') && msg.includes('pay'))) {
    return "We offer two payment methods:\n\n**1. USSD Push (Recommended)**\n• Enter your phone number\n• A payment prompt is sent directly to your phone\n• Confirm by entering your PIN\n• Payment is verified automatically in ~90 seconds\n\n**2. Manual Payment**\n• View the admin's payment details (phone + name)\n• Send money via M-Pesa or Airtel Money\n• Paste the confirmation message\n• Wait for admin verification (usually within 1-24 hours)";
  }

  if (msg.includes('ussd') || (msg.includes('push') && msg.includes('pay'))) {
    return "**USSD Push Payment:**\n\n1. Enter your phone number (e.g., 0695123456)\n2. Click Pay — a USSD prompt is sent to your phone\n3. Enter your M-Pesa/Airtel Money PIN to confirm\n4. The system checks payment status automatically\n5. Payment completes within 90 seconds\n\n**Troubleshooting:**\n• No prompt? Check your network signal and try again\n• Wrong number? Go back and re-enter\n• Balance issue? Ensure sufficient funds";
  }

  if (msg.includes('manual') && msg.includes('pay')) {
    return "**Manual Payment:**\n\n1. View the payment recipient's details (name & phone)\n2. Copy the phone number and send money via M-Pesa/Airtel Money\n3. Come back and paste the confirmation message\n4. Submit for admin verification\n\nManual payments are typically verified within 1-24 hours. You'll receive a notification once verified.";
  }

  if (msg.includes('payment') && (msg.includes('fail') || msg.includes('stuck') || msg.includes('pending') || (msg.includes('not') && msg.includes('work')))) {
    return "**Payment Troubleshooting:**\n\n• **USSD not received:** Check your network signal, verify the phone number format (07XX or 06XX), and try again in 1-2 minutes\n• **Stuck on pending:** The system polls for 90 seconds. If still pending, it may time out. Check your M-Pesa/Airtel Money balance and try again\n• **Manual not verified:** Admin reviews these manually — please allow 1-24 hours. Make sure you uploaded a clear confirmation message\n• **Failed payment:** You can retry immediately with a new attempt\n\nIf issues persist, try using the alternative payment method.";
  }

  // === LIVE TV / CHANNELS ===
  if (msg.includes('channel') || msg.includes('live tv') || msg.includes('tv') || msg.includes('stream') || msg.includes('watch')) {
    return "**Live TV Channels:**\n\nBrowse and watch live TV channels in the **Live TV** section. Channels are organized by categories: Sports, News, Entertainment, Movies, Music, Kids, Documentary, and more.\n\n**Subscription required:** You need an active subscription to watch channels. Plans are available as:\n• Weekly\n• Monthly\n• Yearly\n\nClick any channel to subscribe or start watching if already subscribed. You can also apply promo codes for discounts!";
  }

  // === SUBSCRIPTIONS ===
  if (msg.includes('subscri') || (msg.includes('plan') && (msg.includes('price') || msg.includes('cost')))) {
    return "**Channel Subscriptions:**\n\nTo watch live TV, you need a subscription. Available plans:\n• **Weekly** — 7 days access\n• **Monthly** — 30 days access\n• **Yearly** — 365 days access\n\nTo subscribe:\n1. Go to **Live TV** and click any channel\n2. Choose your preferred plan\n3. Optionally apply a promo code\n4. Enter phone number and pay via USSD\n\nYou can check your subscription status anytime when clicking a channel.";
  }

  // === PROMO CODES ===
  if (msg.includes('promo') || msg.includes('discount') || msg.includes('coupon') || msg.includes('code')) {
    return "**Promo Codes:**\n\nPromo codes can give you discounts on channel subscriptions. Three types:\n\n• **Percentage discount** — e.g., 50% off the plan price\n• **Fixed amount** — e.g., TZS 5,000 off\n• **Free access** — Free subscription for a set number of days\n\nTo use a promo code:\n1. Go to the subscription page (click any channel)\n2. Select a plan\n3. Enter your promo code and click **Apply**\n4. The discount will be shown in the price summary\n\nPromo codes may have usage limits and expiry dates.";
  }

  // === ADULT CONTENT ===
  if (msg.includes('18+') || msg.includes('adult') || msg.includes('premium video') || msg.includes('mature')) {
    return "**18+ Premium Videos:**\n\nThe 18+ section contains premium adult content. Features:\n\n• Browse videos by category\n• **Free videos** — Watch immediately\n• **Paid videos** — Pay to unlock (one-time purchase)\n• Video player with fullscreen support\n\nTo access:\n1. Go to **18+ Videos** from the navigation\n2. Confirm age verification (18+ required)\n3. Browse and click any video to watch or unlock\n\nPaid videos are unlocked permanently after purchase.";
  }

  // === PROFILE & ACCOUNT ===
  if (msg.includes('profile') || msg.includes('account') || (msg.includes('edit') && (msg.includes('name') || msg.includes('phone'))) || msg.includes('picture')) {
    return "**Profile Management:**\n\n• Go to **Profile Settings** to manage your account\n• You can update your **full name** and **phone number**\n• Upload a **profile picture** (max 5MB)\n• Your email is verified and shown as read-only\n• Change your password in the security section\n\nProfile picture changes will reflect everywhere across the app.";
  }

  if (msg.includes('password') || msg.includes('change pass') || msg.includes('reset pass')) {
    return "To change your password:\n\n1. Go to **Profile Settings**\n2. Scroll to the Change Password section\n3. Enter your current password\n4. Enter and confirm your new password (min 6 characters)\n5. Click Save\n\nIf you forgot your password, please contact support for a reset.";
  }

  // === TRANSACTIONS ===
  if (msg.includes('transaction') || msg.includes('history') || msg.includes('receipt')) {
    return "View all your payment history in the **Transactions** page:\n\n• See all transactions grouped by date\n• Filter by status: All, Paid, Pending, Failed\n• View details: amount, payment method, phone, transaction ID\n• See total amount spent\n\nEach transaction corresponds to an order or subscription payment.";
  }

  // === NOTIFICATIONS ===
  if (msg.includes('notification') || msg.includes('alert') || msg.includes('notify')) {
    return "**Notifications:**\n\nYou receive notifications for:\n• Payment confirmations (completed/failed)\n• Order status updates (processing, active, delivered)\n• Subscription activations\n• Manual payment verifications\n\nView all notifications in the **Notifications** page. You can mark individual notifications or all as read. The bell icon shows your unread count.";
  }

  // === OTP / VERIFICATION ===
  if (msg.includes('otp') || msg.includes('verification') || msg.includes('verify') || (msg.includes('code') && msg.includes('email'))) {
    return "**Email Verification:**\n\nOTP verification is required **only once** — when you first register. You'll receive a 6-digit code via email.\n\n• Enter the code on the verification screen\n• Code expires after a few minutes\n• Click **Resend** if you didn't receive it (60s cooldown)\n• After verification, you can log in normally without OTP\n\nCheck your spam/junk folder if you don't see the email.";
  }

  // === GENERAL SUPPORT ===
  if (msg.includes('help') || msg.includes('support') || msg.includes('assist') || msg.includes('msaada')) {
    return "I can help you with many things! Here are some topics:\n\n• **Ordering** — How to browse and buy services\n• **Payments** — USSD Push and Manual payment methods\n• **Live TV** — Channel subscriptions and streaming\n• **Promo Codes** — Discounts and free access\n• **18+ Content** — Premium video access\n• **Account** — Profile, password, notifications\n• **Transactions** — Payment history\n\nJust ask about any topic and I'll provide detailed guidance!";
  }

  if (msg.includes('refund') || msg.includes('cancel') || msg.includes('money back')) {
    return "For refund or cancellation requests, please note:\n\n• Refunds are handled on a case-by-case basis\n• Contact the admin through the app or email support\n• Processing time: 24-48 hours\n• Digital service activations may not be refundable\n\nFor billing issues, check your **Transactions** page to verify the charge details first.";
  }

  if (msg.includes('not working') || msg.includes('error') || msg.includes('bug') || msg.includes('problem') || msg.includes('issue')) {
    return "Sorry to hear you're having trouble! Here are some general troubleshooting steps:\n\n1. **Refresh the page** (Ctrl+R or pull down)\n2. **Clear browser cache** and try again\n3. **Check your internet connection**\n4. **Log out and log back in**\n5. If the issue persists, note the error message and contact support\n\nCan you describe the specific issue? I may be able to help further.";
  }

  // Default response
  return "Thank you for your message! I can help with:\n\n• Ordering & services\n• Payments (USSD/Manual)\n• Live TV subscriptions\n• Promo codes\n• 18+ premium content\n• Account settings\n• Transaction history\n\nCould you be more specific about what you need help with? I'll provide detailed guidance!";
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello ${user?.fullName?.split(' ')[0] || 'there'}! 👋 I'm Newell, your i-net support assistant. I can help you with:\n\n• Services & ordering\n• Payments & subscriptions\n• Live TV channels\n• Account & profile\n• Troubleshooting\n\nHow can I help you today?`,
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

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    const reply = getNewellResponse(text, messages);
    setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply, time: new Date() }]);
    setTyping(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Render markdown-like text (bold, bullet points, newlines)
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet
      if (rendered.startsWith('• ')) {
        return <div key={i} className="chat-bullet" dangerouslySetInnerHTML={{ __html: '&bull; ' + rendered.slice(2) }} />;
      }
      // Numbered
      if (/^\d+\.\s/.test(rendered)) {
        return <div key={i} className="chat-numbered" dangerouslySetInnerHTML={{ __html: rendered }} />;
      }
      if (rendered.trim() === '') return <br key={i} />;
      return <div key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <HiChatAlt2 size={24} />
        <div>
          <h1>Newell Assistant</h1>
          <span className="chat-online"><span className="chat-online-dot" /> Online — ready to help</span>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="chat-avatar">
                {msg.sender === 'ai' ? <HiSparkles size={16} /> : <HiUser size={16} />}
              </div>
              <div className="chat-content">
                {msg.sender === 'ai' ? (
                  <div className="chat-rich-text">{renderText(msg.text)}</div>
                ) : (
                  <p>{msg.text}</p>
                )}
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
