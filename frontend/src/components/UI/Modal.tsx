import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  // Render via portal so the modal escapes any ancestor stacking context
  // (e.g. <header> with position:fixed z-50 traps descendants' z-index).
  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 sm:py-10">
        <div
          className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-fade-in my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-3 right-3 text-white/30 hover:text-white/60 text-xl font-bold"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
          {title && <h2 className="text-xl font-semibold mb-4 text-white pr-8">{title}</h2>}
          <div>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}; 