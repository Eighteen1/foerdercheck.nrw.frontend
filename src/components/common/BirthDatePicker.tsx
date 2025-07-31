import React from 'react';
import CustomDatePicker from './DatePicker';

interface BirthDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  isInvalid?: boolean;
  disabled?: boolean;
  label?: string;
}

const BirthDatePicker: React.FC<BirthDatePickerProps> = ({
  value,
  onChange,
  isInvalid = false,
  disabled = false,
  label = 'Geburtsdatum'
}) => {
  return (
    <CustomDatePicker
      value={value}
      onChange={onChange}
      label={label}
      isInvalid={isInvalid}
      disabled={disabled}
      showYearDropdown={true}
      showMonthDropdown={true}
      dropdownMode="select"
      dateFormat="dd.MM.yyyy"
    />
  );
};

export default BirthDatePicker; 