import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/userService';
import { getInitials } from '../../utils/formatters';
import { AtSign } from 'lucide-react';

/**
 * Helper to render comment text with clickable/highlighted mention tags
 */
export const renderCommentWithMentions = (text) => {
  if (!text) return null;

  // Split by @mention pattern
  const parts = text.split(/(@[a-zA-Z0-9_\.\-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          style={{
            background: 'rgba(255, 91, 38, 0.12)',
            color: 'var(--coral-primary)',
            padding: '1px 6px',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: '0.85rem',
            margin: '0 2px',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const MentionInput = ({ value, onChange, onSubmit, disabled, placeholder = 'Write a comment with @mention...' }) => {
  const [users, setUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userService.getUsers();
        if (res?.data?.users) {
          setUsers(res.data.users);
        }
      } catch (err) {
        console.warn('Failed to load user directory for mentions');
      }
    };
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    onChange(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there is a space after @
      if (!query.includes(' ') && query.length >= 0) {
        setSuggestionQuery(query.toLowerCase());
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
  };

  const filteredUsers = users.filter((u) => {
    if (!suggestionQuery) return true;
    return (
      u.name.toLowerCase().includes(suggestionQuery) ||
      u.email.toLowerCase().includes(suggestionQuery)
    );
  });

  const selectUser = (user) => {
    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Use first name or combined username
      const mentionName = user.name.replace(/\s+/g, '');
      const newText =
        textBeforeCursor.substring(0, lastAtIndex) +
        `@${mentionName} ` +
        textAfterCursor;

      onChange(newText);
      setShowSuggestions(false);

      setTimeout(() => {
        if (inputRef.current) {
          const newPos = lastAtIndex + mentionName.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{ marginBottom: 0, paddingRight: 40 }}
      />

      {/* Suggestion Dropdown Popup */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 8,
            width: 260,
            maxHeight: 200,
            overflowY: 'auto',
            background: '#FFFFFF',
            borderRadius: 'var(--card-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #E2E8F0',
            zIndex: 100,
            padding: 6,
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '4px 8px',
              textTransform: 'uppercase',
            }}
          >
            Mention Team Member
          </div>
          {filteredUsers.map((u, idx) => (
            <div
              key={u._id}
              onClick={() => selectUser(u)}
              onMouseEnter={() => setSelectedIndex(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: idx === selectedIndex ? 'rgba(255, 91, 38, 0.08)' : 'transparent',
                color: idx === selectedIndex ? 'var(--coral-primary)' : 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--coral-gradient)',
                  color: '#FFF',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getInitials(u.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {u.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
