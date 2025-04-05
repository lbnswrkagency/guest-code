import React from "react";

const TermsOfService = () => {
  return (
    <div className="legal-content terms-of-service">
      <h3>Terms of Service</h3>
      <p>
        <strong>Last Updated:</strong>{" "}
        {new Date().toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <p>
        Welcome to GuestCode. The following Terms of Service ("Terms") govern
        your access to and use of the GuestCode platform, including any content,
        functionality, and services offered on or through guest-code.com (the
        "Service").
      </p>

      <h3>Acceptance of Terms</h3>
      <p>
        By accessing or using the Service, you agree to be bound by these Terms.
        If you do not agree to these Terms, you may not access or use the
        Service.
      </p>

      <h3>Changes to Terms</h3>
      <p>
        We may modify these Terms at any time. It is your responsibility to
        review these Terms periodically. Your continued use of the Service after
        any modifications indicates your acceptance of the modified Terms.
      </p>

      <h3>Eligibility</h3>
      <p>
        You must be at least 18 years of age to use the Service. By agreeing to
        these Terms, you represent and warrant that you are at least 18 years of
        age.
      </p>

      <h3>Account Registration</h3>
      <p>
        To access certain features of the Service, you may be required to
        register for an account. You agree to provide accurate, current, and
        complete information during the registration process and to update such
        information to keep it accurate, current, and complete.
      </p>

      <h3>User Content</h3>
      <p>
        The Service allows you to post, upload, store, share, send, or display
        content, including but not limited to text, graphics, photos, audio,
        video, and links ("User Content"). You retain all rights in the User
        Content you post on the Service.
      </p>
      <p>
        By posting User Content, you grant us a non-exclusive, transferable,
        sub-licensable, royalty-free, worldwide license to use, copy, modify,
        create derivative works based on, distribute, publicly display, publicly
        perform, and otherwise use the User Content in connection with operating
        and providing the Service.
      </p>

      <h3>Prohibited Activities</h3>
      <p>
        You agree not to engage in any of the following prohibited activities:
      </p>
      <ul>
        <li>
          Using the Service for any illegal purpose or in violation of any
          applicable laws
        </li>
        <li>Posting unauthorized commercial communications</li>
        <li>Uploading viruses or other malicious code</li>
        <li>
          Attempting to access accounts, systems, or networks without
          authorization
        </li>
        <li>Impersonating another person</li>
        <li>Infringing the intellectual property rights of others</li>
        <li>
          Posting content that is hate speech, threatening, or pornographic;
          incites violence; or contains nudity or graphic or gratuitous violence
        </li>
        <li>Using the Service to send spam</li>
      </ul>

      <h3>Intellectual Property</h3>
      <p>
        The Service and its original content, features, and functionality are
        owned by LBNSWRK LLC dba GuestCode and are protected by international
        copyright, trademark, patent, trade secret, and other intellectual
        property or proprietary rights laws.
      </p>

      <h3>Third Party Links</h3>
      <p>
        The Service may contain links to third-party websites or services that
        are not owned or controlled by GuestCode. We have no control over, and
        assume no responsibility for, the content, privacy policies, or
        practices of any third-party websites or services.
      </p>

      <h3>Termination</h3>
      <p>
        We may terminate or suspend your account and bar access to the Service
        immediately, without prior notice or liability, under our sole
        discretion, for any reason whatsoever, including but not limited to a
        breach of the Terms.
      </p>

      <h3>Limitation of Liability</h3>
      <p>
        In no event shall GuestCode, nor its directors, employees, partners,
        agents, suppliers, or affiliates, be liable for any indirect,
        incidental, special, consequential or punitive damages, including
        without limitation, loss of profits, data, use, goodwill, or other
        intangible losses, resulting from your access to or use of or inability
        to access or use the Service.
      </p>

      <h3>Disclaimer</h3>
      <p>
        Your use of the Service is at your sole risk. The Service is provided on
        an "AS IS" and "AS AVAILABLE" basis. The Service is provided without
        warranties of any kind, whether express or implied.
      </p>

      <h3>Governing Law</h3>
      <p>
        These Terms shall be governed and construed in accordance with the laws
        of Wyoming, United States, without regard to its conflict of law
        provisions.
      </p>

      <h3>Changes to Service</h3>
      <p>
        We reserve the right to withdraw or amend our Service, and any service
        or material we provide via the Service, in our sole discretion without
        notice. We will not be liable if for any reason all or any part of the
        Service is unavailable at any time or for any period.
      </p>

      <h3>Contact Us</h3>
      <p>
        If you have any questions about these Terms, please contact us at:{" "}
        <a href="mailto:contact@guest-code.com">contact@guest-code.com</a>
      </p>
    </div>
  );
};

export default TermsOfService;
