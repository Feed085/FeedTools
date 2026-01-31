import React from 'react';

const ModernButton = ({ text, onClick, disabled, className, variant, icon, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`modern-button ${disabled ? 'disabled' : ''} ${variant ? variant + '-button' : ''} ${className || ''}`}
        {...props}
    >
        {icon && <span className="button-icon">{icon}</span>}
        <span>{text}</span>
    </button>
);

export default ModernButton;
