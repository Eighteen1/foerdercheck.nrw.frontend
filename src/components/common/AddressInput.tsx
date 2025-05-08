import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { useLoadScript } from '@react-google-maps/api';

interface AddressInputProps {
  value: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
  onChange: (address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  }) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

const libraries: ("places")[] = ["places"];

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  isInvalid = false,
  errorMessage
}) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  useEffect(() => {
    if (isLoaded && !loadError && inputRef.current) {
      const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'de' },
        fields: ['address_components', 'formatted_address'],
        types: ['address']
      });

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (place.address_components) {
          const addressComponents = place.address_components;
          const streetNumber = addressComponents.find(component => 
            component.types.includes('street_number')
          )?.long_name || '';
          
          const route = addressComponents.find(component => 
            component.types.includes('route')
          )?.long_name || '';
          
          const postalCode = addressComponents.find(component => 
            component.types.includes('postal_code')
          )?.long_name || '';
          
          const city = addressComponents.find(component => 
            component.types.includes('locality')
          )?.long_name || '';

          onChange({
            street: route,
            houseNumber: streetNumber,
            postalCode,
            city
          });
        }
      });

      setAutocomplete(autocompleteInstance);
    }
  }, [isLoaded, loadError, onChange]);

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      street: e.target.value
    });
  };

  const handleHouseNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      houseNumber: e.target.value
    });
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      postalCode: e.target.value
    });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      city: e.target.value
    });
  };

  if (loadError) {
    return <div>Error loading Google Maps API</div>;
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="row g-3">
        <div className="col-md-8">
          <Form.Floating>
            <Form.Control
              ref={inputRef}
              type="text"
              placeholder="Straße"
              value={value.street}
              onChange={handleStreetChange}
              isInvalid={isInvalid}
            />
            <label>Straße</label>
            {isInvalid && errorMessage && (
              <Form.Control.Feedback type="invalid">
                {errorMessage}
              </Form.Control.Feedback>
            )}
          </Form.Floating>
        </div>
        <div className="col-md-4">
          <Form.Floating>
            <Form.Control
              type="text"
              placeholder="Hausnummer"
              value={value.houseNumber}
              onChange={handleHouseNumberChange}
              isInvalid={isInvalid}
            />
            <label>Hausnummer</label>
          </Form.Floating>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <Form.Floating>
            <Form.Control
              type="text"
              placeholder="Postleitzahl"
              value={value.postalCode}
              onChange={handlePostalCodeChange}
              isInvalid={isInvalid}
            />
            <label>Postleitzahl</label>
          </Form.Floating>
        </div>
        <div className="col-md-8">
          <Form.Floating>
            <Form.Control
              type="text"
              placeholder="Ort"
              value={value.city}
              onChange={handleCityChange}
              isInvalid={isInvalid}
            />
            <label>Ort</label>
          </Form.Floating>
        </div>
      </div>
    </div>
  );
};

export default AddressInput; 