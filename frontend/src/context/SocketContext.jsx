import React, { createContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [toasts, setToasts] = useState([]);
  const { user, isAuthenticated } = useAuth();

  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnectionStatus('disconnected');
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');

      // Join user specific room
      if (user && (user._id || user.id)) {
        const userId = user._id || user.id;
        newSocket.emit('join_user_room', userId);
      }
    });

    newSocket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    newSocket.on('reconnect', () => {
      setConnectionStatus('connected');
      if (user && (user._id || user.id)) {
        const userId = user._id || user.id;
        newSocket.emit('join_user_room', userId);
      }
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    // Global listener for targeted notifications to pop a toast
    newSocket.on('notificationCreated', (notification) => {
      addToast({
        title: 'New Notification',
        message: notification.message,
        type: notification.type,
        taskId: notification.task?._id || notification.task,
      });
    });

    // Global listener for direct task assignments
    newSocket.on('taskAssigned', (task) => {
      addToast({
        title: 'Task Assigned',
        message: `You were assigned: "${task.title}"`,
        type: 'TASK_ASSIGNED',
        taskId: task._id,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('notificationCreated');
      newSocket.off('taskAssigned');
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?._id, user?.id, addToast]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected: connectionStatus === 'connected',
        connectionStatus,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
