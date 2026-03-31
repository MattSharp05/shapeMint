import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute top-3 right-3 text-white/30 hover:text-white/60 text-xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        {title && <h2 className="text-xl font-semibold mb-4 text-white">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
}; 