import React, { useState, useRef, useEffect } from 'react';
import { Form } from 'react-bootstrap';

interface AreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

const AreaInput: React.FC<AreaInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  isInvalid = false,
  errorMessage
}) => {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the value as area (with decimal places)
  const formatArea = (value: string): string => {
    if (value === '') return '';
    
    // Remove all non-numeric characters except decimal point/comma
    let cleanValue = value.replace(/[^0-9,\.]/g, '');
    
    // Replace dot with comma for German decimal formatting
    cleanValue = cleanValue.replace('.', ',');
    
    // Ensure only one decimal separator (comma)
    const parts = cleanValue.split(',');
    if (parts.length > 2) {
      cleanValue = parts[0] + ',' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
    }
    
    return cleanValue;
  };

  // Convert database value (with dot) to display format (with comma)
  const formatValueForDisplay = (value: string): string => {
    if (value === '') return '';
    return formatArea(value);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Format the value
    const formattedValue = formatArea(inputValue);
    
    // Simple cursor position management
    setCursorPosition(cursorPos);
    onChange(formattedValue);
  };

  // Handle key press to prevent invalid characters
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ',', 'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const isCtrlKey = e.ctrlKey || e.metaKey;
    
    if (!allowedKeys.includes(e.key) && !isCtrlKey) {
      e.preventDefault();
    }
  };

  // Restore cursor position after formatting
  useEffect(() => {
    if (cursorPosition !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [value, cursorPosition]);

  return (
    <Form.Floating>
      <Form.Control
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={formatValueForDisplay(value)}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        disabled={disabled}
        isInvalid={isInvalid}
      />
      {label && <label>{label}</label>}
      {isInvalid && errorMessage && (
        <Form.Control.Feedback type="invalid">
          {errorMessage}
        </Form.Control.Feedback>
      )}
    </Form.Floating>
  );
};

export default AreaInput; 