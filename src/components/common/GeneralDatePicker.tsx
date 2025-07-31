import React from 'react';
import CustomDatePicker from './DatePicker';

interface GeneralDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  isInvalid?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

const GeneralDatePicker: React.FC<GeneralDatePickerProps> = ({
  value,
  onChange,
  isInvalid = false,
  disabled = false,
  label,
  placeholder = "Datum auswählen",
  minDate,
  maxDate
}) => {
  return (
    <CustomDatePicker
      value={value}
      onChange={onChange}
      label={label}
      isInvalid={isInvalid}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      showYearDropdown={true}
      showMonthDropdown={true}
      dropdownMode="select"
      dateFormat="dd.MM.yyyy"
      placeholder={placeholder}
    />
  );
};

export default GeneralDatePicker; 