import React from "react";

const Imprint = () => {
  return (
    <div className="legal-content imprint">
      <h3>Company Information</h3>
      <p>
        <strong>LBNSWRK LLC</strong>
        <br />
        dba GuestCode
        <br />
        5830 E 2ND ST, STE 7000 #14531
        <br />
        CASPER, WYOMING 82609
        <br />
        USA
      </p>

      <h3>Contact Information</h3>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:contact@guest-code.com">contact@guest-code.com</a>
        <br />
        <strong>Phone:</strong> 888-462-3453
      </p>

      <h3>Company Details</h3>
      <p>
        <strong>EIN:</strong> 32-0758843
        <br />
        <strong>Legal Form:</strong> Limited Liability Company
        <br />
        <strong>Registered in:</strong> Wyoming, USA
        <br />
        <strong>Registered Agent:</strong> REPUBLIC REGISTERED AGENT LLC
      </p>

      <h3>Responsible for Content</h3>
      <p>
        ZAFER GUENEY
        <br />
        MEMBER
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
