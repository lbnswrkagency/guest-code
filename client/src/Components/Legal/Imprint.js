import React from "react";

const Imprint = () => {
  return (
    <div className="legal-content imprint">
      <h3>Company Information</h3>
      <p>
        <strong>LBNSWRK E.E.</strong>
        <br />
        dba GuestCode
        <br />
        Davaki Pindou 14
        <br />
        15773 Zografou, Athens
        <br />
        Greece
      </p>

      <h3>Contact Information</h3>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:contact@guest-code.com">contact@guest-code.com</a>
      </p>

      <h3>Company Details</h3>
      <p>
        <strong>ΑΦΜ (VAT):</strong> 803058973
        <br />
        <strong>Tax Office:</strong> ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ
        <br />
        <strong>Γ.Ε.ΜΗ.:</strong> 188401803000
        <br />
        <strong>Legal Form:</strong> Ετερόρρυθμη Εταιρεία (Limited Partnership)
        <br />
        <strong>Registered in:</strong> Athens, Greece
      </p>

      <h3>Legal Representative</h3>
      <p>
        Zafer Gueney
        <br />
        General Partner
      </p>

      <h3>Online Dispute Resolution</h3>
      <p>
        The European Commission provides a platform for online dispute
        resolution (ODR) which is accessible at{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
      </p>

      <h3>Disclaimer</h3>
      <p>
        Despite careful content control, we assume no liability for the content
        of external links. The operators of the linked pages are solely
        responsible for their content.
      </p>
    </div>
  );
};

export default Imprint;
