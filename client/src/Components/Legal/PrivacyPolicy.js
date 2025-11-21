import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="legal-content privacy-policy">
      <h3>Privacy Policy</h3>
      <p>
        <strong>Last Updated:</strong>{" "}
        {new Date().toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <p>
        LBNSWRK E.E. dba GuestCode ("we", "our", or "us") is committed to
        protecting your privacy. This Privacy Policy explains how your personal
        information is collected, used, and disclosed by GuestCode in accordance
        with the General Data Protection Regulation (GDPR) and applicable Greek
        and European Union data protection laws.
      </p>

      <h3>Information We Collect</h3>
      <p>We collect information you provide directly to us, such as:</p>
      <ul>
        <li>Account information (name, email address, password, etc.)</li>
        <li>Profile information (profile picture, biographical information)</li>
        <li>Event information (event details, guest lists, tickets)</li>
        <li>Payment information (processed by our secure payment providers)</li>
        <li>Communications with us</li>
      </ul>

      <p>
        We also automatically collect certain information when you use our
        platform:
      </p>
      <ul>
        <li>Log information (IP address, browser type, pages visited, etc.)</li>
        <li>
          Device information (hardware model, operating system, unique device
          identifiers)
        </li>
        <li>Location information (with your consent)</li>
        <li>Cookie and similar technology information</li>
      </ul>

      <h3>How We Use Your Information</h3>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process transactions and send related information</li>
        <li>
          Send technical notices, updates, security alerts, and support messages
        </li>
        <li>
          Respond to your comments, questions, and customer service requests
        </li>
        <li>
          Communicate with you about products, services, offers, and events
        </li>
        <li>Monitor and analyze trends, usage, and activities</li>
        <li>
          Detect, investigate, and prevent fraudulent transactions and other
          illegal activities
        </li>
        <li>Personalize your experience</li>
      </ul>

      <h3>Sharing of Information</h3>
      <p>We may share your information with:</p>
      <ul>
        <li>
          Vendors, consultants, and other service providers who need access to
          such information to carry out work on our behalf
        </li>
        <li>
          Event organizers when you purchase tickets or register for events
        </li>
        <li>
          Other users, when you share information through the platform's social
          features
        </li>
        <li>
          In response to a request for information if we believe disclosure is
          in accordance with applicable law
        </li>
        <li>
          If we believe your actions are inconsistent with our user agreements
          or policies
        </li>
        <li>
          In connection with, or during negotiations of, any merger, sale of
          company assets, financing, or acquisition
        </li>
      </ul>

      <h3>Your Choices</h3>
      <p>
        <strong>Account Information:</strong> You may update, correct, or delete
        your account information at any time by logging into your account.
      </p>
      <p>
        <strong>Cookies:</strong> Most web browsers are set to accept cookies by
        default. You can usually set your browser to remove or reject cookies.
      </p>
      <p>
        <strong>Promotional Communications:</strong> You may opt out of
        receiving promotional emails from us by following the instructions in
        those emails.
      </p>

      <h3>Data Retention</h3>
      <p>
        We store the information we collect about you for as long as is
        necessary for the purpose(s) for which we originally collected it or for
        other legitimate business purposes.
      </p>

      <h3>Security</h3>
      <p>
        We take reasonable measures to help protect information about you from
        loss, theft, misuse, unauthorized access, disclosure, alteration, and
        destruction.
      </p>

      <h3>International Transfer</h3>
      <p>
        We are based in Greece, European Union, and the information we collect
        is governed by EU law, including the General Data Protection Regulation
        (GDPR). Your data is primarily processed within the European Economic
        Area (EEA). If data is transferred outside the EEA, we ensure appropriate
        safeguards are in place in accordance with GDPR requirements.
      </p>

      <h3>Your Rights Under GDPR</h3>
      <p>
        Under the GDPR, you have the following rights regarding your personal data:
      </p>
      <ul>
        <li>Right to access your personal data</li>
        <li>Right to rectification of inaccurate data</li>
        <li>Right to erasure ("right to be forgotten")</li>
        <li>Right to restrict processing</li>
        <li>Right to data portability</li>
        <li>Right to object to processing</li>
        <li>Right to withdraw consent at any time</li>
      </ul>
      <p>
        To exercise any of these rights, please contact us at{" "}
        <a href="mailto:contact@guest-code.com">contact@guest-code.com</a>.
      </p>

      <h3>Changes to This Privacy Policy</h3>
      <p>
        We may change this privacy policy from time to time. If we make changes,
        we will notify you by revising the date at the top of the policy.
      </p>

      <h3>Contact Us</h3>
      <p>
        If you have any questions about this Privacy Policy, please contact us
        at: <a href="mailto:contact@guest-code.com">contact@guest-code.com</a>
      </p>
    </div>
  );
};

export default PrivacyPolicy;
