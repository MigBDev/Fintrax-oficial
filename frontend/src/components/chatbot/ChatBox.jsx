import React, { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const ChatBox = ({ onClose }) => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const nombre = usuario?.nombre?.trim() || "usuario";

  const [messages, setMessages] = useState([
    { 
      sender: "bot", 
      text: `¡Hola, ${nombre}! Soy Finyx, tu asistente financiero. ¿En qué puedo ayudarte hoy?`,
      timestamp: Date.now()
    }
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    "Hola",
    "Dame un consejo financiero",
    "¿Cómo están mis finanzas?"
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessageToBackend = async (message) => {
  try {
    const res = await fetch("http://localhost:3000/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        usuario_documento: usuario?.documento,
        usuario_nombre: usuario?.nombre
      }),
    });

    const data = await res.json();
    // devolvemos el objeto completo (reply + created + createdTransaction)
    return data;

  } catch (err) {
    console.error("Error fetch chatbot:", err);
    return { reply: "Error al comunicarme con el servidor.", created: false };
  }
};


  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: "user", text, timestamp: Date.now() }]);
    setQuickReplies([]);
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 600));

    const result = await sendMessageToBackend(text);
const botReply = result?.reply || "No recibí respuesta del servidor.";

setIsTyping(false);
setMessages(prev => [...prev, { sender: "bot", text: botReply, timestamp: Date.now() }]);

// --- DETECCIÓN ROBUSTA: usar la bandera creada desde el backend ---
if (result && result.created) {
  console.log("ChatBox: transacción creada detectada desde backend:", result.createdTransaction);
  localStorage.setItem('dashboard_actualizar', Date.now());
  window.dispatchEvent(new Event("dashboardUpdate"));
}


  };

  return (
    <div className="chatbox">
      <div className="chatbox-header">
        <div className="chatbox-header-title">
          <div className="chatbox-status-indicator"></div>
          <span>Finyx</span>
        </div>

        <div className="chatbox-header-actions">
          <button onClick={onClose}><span className="material-icons">remove</span></button>
          <button onClick={onClose}><span className="material-icons">close</span></button>
        </div>
      </div>

      <div className="chatbox-messages">
        {messages.map((msg, index) => (
          <ChatMessage key={index} sender={msg.sender} text={msg.text} timestamp={msg.timestamp} />
        ))}

        {isTyping && (
          <div className="chat-message bot">
            <div className="chat-message-avatar">
              <span className="material-icons">smart_toy</span>
            </div>
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {quickReplies.length > 0 && (
        <div className="quick-replies">
          {quickReplies.map((reply, i) => (
            <button key={i} onClick={() => handleSendMessage(reply)} className="quick-reply-btn">
              {reply}
            </button>
          ))}
        </div>
      )}

      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatBox;
