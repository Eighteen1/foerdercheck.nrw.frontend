import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const WeitereEinkuenfteMultiSelect: React.FC<Props> = ({ options, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center w-100">
      <Button
        variant={value.length > 0 ? 'primary' : 'outline-primary'}
        className="rounded-pill px-4 py-2 mb-2"
        style={{ minWidth: 260, fontWeight: 500, backgroundColor: '#064497', color: '#fff', borderColor: '#064497', boxShadow: '0 2px 8px rgba(6,68,151,0.08)' }}
        onClick={() => setShow(true)}
      >
        {value.length === 0
          ? (placeholder || '+ Weitere Einkünfte hinzufügen')
          : '+ Weitere Einkünfte hinzufügen/entfernen'}
      </Button>
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Weitere Einkünfte auswählen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column gap-2">
            {options.map(option => (
              <div key={option.value} className="d-flex align-items-center gap-2">
                <Form.Check
                  type="checkbox"
                  id={`weitere-einkuenfte-${option.value}`}
                  checked={value.includes(option.value)}
                  onChange={() => handleSelect(option.value)}
                  style={{ marginRight: 8 }}
                />
                <label htmlFor={`weitere-einkuenfte-${option.value}`} style={{ marginBottom: 0, fontWeight: 400 }}>{option.label}</label>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
           style={{ backgroundColor: '#064497', border: 'none' }}
           onClick={() => setShow(false)}
           >
            Fertig
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default WeitereEinkuenfteMultiSelect; 