import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Smile } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { meetingService } from '../../services/meetingService';

export const ChatPanel = ({ meetingId, meetingCode, onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Fetch past messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await meetingService.getMessages(meetingId);
        setMessages(res.messages || []);
      } catch (err) {
        console.error('[ChatPanel] Failed to fetch messages:', err.message);
      }
    };
    if (meetingId) fetchMessages();
  }, [meetingId]);

  // Socket listeners for real-time messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleUserTyping = ({ userName }) => {
      setTypingUsers((prev) => new Set(prev).add(userName));
    };

    const handleUserStopTyping = ({ userName }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userName);
        return next;
      });
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [socket]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    if (socket) {
      socket.emit('stop-typing', { meetingCode, userName: user.name });
      socket.emit('send-message', {
        meetingId,
        meetingCode,
        content: text,
        senderId: user._id,
      });
    } else {
      // Fallback HTTP
      try {
        const res = await meetingService.sendMessage(meetingId, { content: text });
        setMessages((prev) => [...prev, res.message]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (socket) {
      socket.emit('typing', { meetingCode, userName: user.name });
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-slideLeft">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-100">In-Meeting Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender?._id === user._id || msg.sender === user._id;
            return (
              <div
                key={msg._id || i}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {msg.sender?.name || (isMe ? 'You' : 'Participant')}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] break-words shadow-md ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-[10px] text-brand-400 font-medium italic animate-pulse">
          {Array.from(typingUsers).join(', ')} is typing...
        </div>
      )}

      {/* Input Footer */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-xl transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
