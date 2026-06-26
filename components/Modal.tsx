
import React from 'react';
import { ModalProps } from '../types';

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClass = {
    md: 'max-w-md',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className={`artquest-panel p-6 shadow-xl ${sizeClass} w-full max-h-[92vh] overflow-y-auto narrative-scrollbar`}>
        <div className="relative z-10 flex justify-between items-center mb-4">
          <h2 className="artquest-panel-title text-2xl font-black uppercase">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="artquest-button px-3 py-1 text-2xl leading-none"
              aria-label="Close modal"
            >
              &times;
            </button>
          )}
        </div>
        <div className="relative z-10 text-gray-200">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
