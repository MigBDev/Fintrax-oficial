import React from "react";

const ChatMessage = ({ sender, text, timestamp }) => {
  return (
    <div className={`chat-message ${sender}`}>
      {/* Avatar del bot */}
      {sender === "bot" && (
        <div className="chat-message-avatar">
          <span className="material-icons">smart_toy</span>
        </div>
      )}

      {/* Burbuja de mensaje con timestamp */}
      <div className="chat-bubble-wrapper">
        <div className="chat-bubble">{text}</div>
        {timestamp && (
          <div className="chat-message-time">
            {new Date(timestamp).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Avatar del usuario */}
      {sender === "user" && (
        <div className="chat-message-avatar user-avatar">
          <span className="material-icons">person</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;