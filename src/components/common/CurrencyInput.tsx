import React, { useState, useRef, useEffect } from 'react';
import { Form } from 'react-bootstrap';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  disabled = false
}) => {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the value as currency
  const formatCurrency = (value: string): string => {
    if (value === '') return '';
    const numberValue = Number(value.replace(/[^0-9]/g, ''));
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(numberValue/100);
  };

  // Parse the currency string back to a number
  const parseCurrency = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Get the raw number value
    const rawValue = parseCurrency(inputValue);
    
    // Format the value
    const formattedValue = formatCurrency(rawValue);
    
    // Calculate new cursor position
    let newCursorPos = cursorPos;
    if (cursorPos !== null) {
      // If we're at the end of the input, keep cursor at the end
      if (cursorPos === inputValue.length) {
        newCursorPos = formattedValue.length;
      } else {
        // Count the number of digits before the cursor
        const digitsBeforeCursor = inputValue.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
        
        // Find the position in the formatted string that has the same number of digits before it
        let digitCount = 0;
        for (let i = 0; i < formattedValue.length; i++) {
          if (/\d/.test(formattedValue[i])) {
            digitCount++;
            if (digitCount === digitsBeforeCursor) {
              newCursorPos = i + 1;
              break;
            }
          }
        }
      }
    }
    
    setCursorPosition(newCursorPos);
    onChange(formattedValue);
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
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
      {label && <label>{label}</label>}
    </Form.Floating>
  );
};

export default CurrencyInput; 