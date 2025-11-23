import React, { useState } from "react";
import ChatBox from "./ChatBox";
import "./ChatBot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Si el chat está abierto, mostrar ChatBox */}
      {isOpen && <ChatBox onClose={() => setIsOpen(false)} />}

      {/* Botón flotante del bot con badge de notificación */}
      <button 
        className="chatbot-toggle-btn" 
        onClick={toggleChat}
        data-unread={hasNewMessage ? "1" : ""}
      >
        <img src="/bot.png" alt="Bot" className="chatbot-icon" />
      </button>
    </div>
  );
};

export default ChatBot;