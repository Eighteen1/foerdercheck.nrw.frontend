import React from 'react';
import DatePicker from 'react-datepicker';
import { Form } from 'react-bootstrap';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
  dropdownMode?: 'scroll' | 'select';
  dateFormat?: string;
  className?: string;
}

const CustomDatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Datum auswählen",
  label,
  isInvalid = false,
  disabled = false,
  minDate,
  maxDate,
  showYearDropdown = true,
  showMonthDropdown = true,
  dropdownMode = 'select',
  dateFormat = 'dd.MM.yyyy',
  className = ''
}) => {
  // Convert string to Date object
  const selectedDate = value ? parseISO(value) : null;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Format as YYYY-MM-DD for HTML input compatibility
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
    } else {
      onChange('');
    }
  };

  // Generate month and year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 140 }, (_, i) => currentYear - 120 + i);
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const handleMonthChange = (monthIndex: number) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setMonth(monthIndex);
      handleDateChange(newDate);
    }
  };

  const handleYearChange = (year: number) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(year);
      handleDateChange(newDate);
    }
  };

  return (
    <div className={`date-picker-container ${className}`}>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat={dateFormat}
        placeholderText={placeholder}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        showYearDropdown={false}
        showMonthDropdown={false}
        dropdownMode={dropdownMode}
        locale={de}
        className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
        wrapperClassName="w-100"
        popperClassName="date-picker-popper"
        popperPlacement="bottom-start"
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div style={{
            margin: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.2rem',
                marginRight: '5px',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              ‹
            </button>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {showMonthDropdown && (
                <Form.Select
                  value={date.getMonth()}
                  onChange={(e) => {
                    changeMonth(parseInt(e.target.value));
                    handleMonthChange(parseInt(e.target.value));
                  }}
                  style={{
                    height: '38px',
                    minWidth: '130px',
                    fontSize: '0.9rem',
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#212529'
                  }}
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </Form.Select>
              )}
              
              {showYearDropdown && (
                <Form.Select
                  value={date.getFullYear()}
                  onChange={(e) => {
                    changeYear(parseInt(e.target.value));
                    handleYearChange(parseInt(e.target.value));
                  }}
                  style={{
                    height: '38px',
                    minWidth: '80px',
                    fontSize: '0.9rem',
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#212529'
                  }}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Form.Select>
              )}
            </div>
            
            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.2rem',
                cursor: 'pointer',
                marginLeft: '5px',
                padding: '0.5rem'
              }}
            >
              ›
            </button>
          </div>
        )}
      />
      {label && (
        <label className="form-label position-absolute" style={{ 
          top: '-0.5rem', 
          left: '0.75rem', 
          fontSize: '0.875rem',
          color: '#6c757d',
          backgroundColor: 'white',
          padding: '0 0.25rem'
        }}>
          {label}
        </label>
      )}
    </div>
  );
};

export default CustomDatePicker; 