import { useEffect, useRef } from 'react';

/**
 * Embedded Reamaze contact form for demo requests.
 * Injects the custom fields config for Reamaze form 1019025,
 * then renders the placeholder div that Reamaze hydrates into an iframe.
 */
export default function ReamazeDemoForm() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Configure custom fields for this specific form
    window._support = window._support || { ui: {}, user: {} };
    window._support['contact_custom_fields'] = window._support['contact_custom_fields'] || {};
    window._support['contact_custom_fields']['rmz_form_id_1019025'] = [
      {
        label: 'Phone Number',
        type: 'phone',
        value: '',
        required: true,
        placeholder: 'Enter your phone number',
        connectContact: true,
      },
      {
        label: 'Your County',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'Enter your county',
      },
    ];

    // Tell Reamaze to scan the DOM and hydrate the embed div
    if (typeof window.reamaze === 'function') {
      window.reamaze('reload');
    }
  }, []);

  return (
    <div ref={containerRef} className="max-w-lg mx-auto">
      <div
        data-reamaze-embed="contact"
        data-reamaze-embed-subject="Demo Request From Client"
        data-reamaze-embed-form-id="1019025"
      />
    </div>
  );
}