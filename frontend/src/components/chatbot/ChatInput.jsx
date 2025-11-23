import React, { useState } from "react";

const ChatInput = ({ onSendMessage, disabled }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      {/* Wrapper del input con botón de enviar integrado */}
      <div className="chat-input-wrapper">
        <input
          type="text"
          placeholder="Escribe tu mensaje..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="chat-send-btn"
        >
          <span className="material-icons">send</span>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;