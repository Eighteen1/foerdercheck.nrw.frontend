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
  isInvalid?: {
    street?: boolean;
    houseNumber?: boolean;
    postalCode?: boolean;
    city?: boolean;
  };
  errorMessages?: {
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
  };
  state?: 'NRW' | 'Bayern' | 'Baden-Württemberg' | 'Berlin' | 'Brandenburg' | 'Bremen' | 'Hamburg' | 'Hessen' | 'Mecklenburg-Vorpommern' | 'Niedersachsen' | 'Rheinland-Pfalz' | 'Saarland' | 'Sachsen' | 'Sachsen-Anhalt' | 'Schleswig-Holstein' | 'Thüringen';
  disabled?: boolean;
}

const libraries: ("places")[] = ["places"];

// Administrative area codes for German states
const stateCodes: { [key: string]: string } = {
  'NRW': 'DE-NW',
  'Bayern': 'DE-BY',
  'Baden-Württemberg': 'DE-BW',
  'Berlin': 'DE-BE',
  'Brandenburg': 'DE-BB',
  'Bremen': 'DE-HB',
  'Hamburg': 'DE-HH',
  'Hessen': 'DE-HE',
  'Mecklenburg-Vorpommern': 'DE-MV',
  'Niedersachsen': 'DE-NI',
  'Rheinland-Pfalz': 'DE-RP',
  'Saarland': 'DE-SL',
  'Sachsen': 'DE-SN',
  'Sachsen-Anhalt': 'DE-ST',
  'Schleswig-Holstein': 'DE-SH',
  'Thüringen': 'DE-TH'
};

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  isInvalid = { street: false, houseNumber: false, postalCode: false, city: false },
  errorMessages = { street: '', houseNumber: '', postalCode: '', city: '' },
  state,
  disabled = false
}) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debug API key
  console.log('Google Maps API Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  useEffect(() => {
    if (isLoaded && !loadError && inputRef.current) {
      // Define bounds for each German state
      const stateBounds: { [key: string]: google.maps.LatLngBounds } = {
        'NRW': new google.maps.LatLngBounds(
          new google.maps.LatLng(50.3237, 5.8663), // Southwest coordinates
          new google.maps.LatLng(52.5317, 9.4643)  // Northeast coordinates
        ),
        // ... other states if needed ...
      };

      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'de' },
        fields: ['address_components', 'formatted_address'],
        types: ['address']
      };

      // Add state filtering through bounds and restrictions
      if (state && stateCodes[state]) {
        options.types = ['address'];
        if (stateBounds[state]) {
          options.bounds = stateBounds[state];
          options.strictBounds = true;
        }
      }

      const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, options);

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        console.log('Place details:', place);
        
        // Store the place data before any modifications
        const placeData = place;
        
        if (placeData && placeData.address_components) {
          const addressComponents = placeData.address_components;
          console.log('Address components:', addressComponents);
          
          // Extract address components first
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

          console.log('Extracted components:', { streetNumber, route, postalCode, city });

          // Verify the selected address is in the correct state
          const administrativeArea = addressComponents.find(component => 
            component.types.includes('administrative_area_level_1')
          );
          
          // Create new address object with all components
          const newAddress = {
            street: route,
            houseNumber: streetNumber,
            postalCode,
            city
          };

          console.log('New address object:', newAddress);

          // Update the form with all address components
          onChange(newAddress);

          // Update the input fields directly
          if (inputRef.current) {
            // Update the street input
            const streetInput = inputRef.current;
            
            // Clear the input and autocomplete
            streetInput.value = '';
            streetInput.blur();
            
            // Reset the autocomplete instance
            autocompleteInstance.set('place', null);
            
            // Set the value back after a short delay
            setTimeout(() => {
              streetInput.value = route;
              streetInput.blur();
            }, 100);
          }

          // Find and update other input fields without triggering events
          const form = inputRef.current?.closest('form');
          if (form) {
            const houseNumberInput = form.querySelector('input[placeholder="Hausnummer"]') as HTMLInputElement;
            const postalCodeInput = form.querySelector('input[placeholder="Postleitzahl"]') as HTMLInputElement;
            const cityInput = form.querySelector('input[placeholder="Ort"]') as HTMLInputElement;

            if (houseNumberInput) {
              houseNumberInput.value = streetNumber;
              houseNumberInput.blur();
            }
            if (postalCodeInput) {
              postalCodeInput.value = postalCode;
              postalCodeInput.blur();
            }
            if (cityInput) {
              cityInput.value = city;
              cityInput.blur();
            }
          }

          // If state is specified and the address is not in the correct state, show an error
          if (state && administrativeArea?.short_name !== stateCodes[state]) {
            console.warn('Selected address is not in the specified state');
          }
        }
      });

      // Add a listener to prevent the autocomplete from showing when the input is not focused
      if (inputRef.current) {
        inputRef.current.addEventListener('blur', () => {
          autocompleteInstance.set('place', null);
        });
      }

      setAutocomplete(autocompleteInstance);
    }
  }, [isLoaded, loadError, onChange, state]);

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newAddress = {
      ...value,
      street: e.target.value
    };
    onChange(newAddress);
  };

  const handleHouseNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newAddress = {
      ...value,
      houseNumber: e.target.value
    };
    onChange(newAddress);
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newAddress = {
      ...value,
      postalCode: e.target.value
    };
    onChange(newAddress);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newAddress = {
      ...value,
      city: e.target.value
    };
    onChange(newAddress);
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
              isInvalid={isInvalid.street}
              disabled={disabled}
            />
            <label>Straße</label>
            {isInvalid.street && errorMessages.street && (
              <Form.Control.Feedback type="invalid">
                {errorMessages.street}
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
              isInvalid={isInvalid.houseNumber}
              disabled={disabled}
            />
            <label>Hausnummer</label>
            {isInvalid.houseNumber && errorMessages.houseNumber && (
              <Form.Control.Feedback type="invalid">
                {errorMessages.houseNumber}
              </Form.Control.Feedback>
            )}
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
              isInvalid={isInvalid.postalCode}
              disabled={disabled}
            />
            <label>Postleitzahl</label>
            {isInvalid.postalCode && errorMessages.postalCode && (
              <Form.Control.Feedback type="invalid">
                {errorMessages.postalCode}
              </Form.Control.Feedback>
            )}
          </Form.Floating>
        </div>
        <div className="col-md-8">
          <Form.Floating>
            <Form.Control
              type="text"
              placeholder="Ort"
              value={value.city}
              onChange={handleCityChange}
              isInvalid={isInvalid.city}
              disabled={disabled}
            />
            <label>Ort</label>
            {isInvalid.city && errorMessages.city && (
              <Form.Control.Feedback type="invalid">
                {errorMessages.city}
              </Form.Control.Feedback>
            )}
          </Form.Floating>
        </div>
      </div>
    </div>
  );
};

export default AddressInput; 