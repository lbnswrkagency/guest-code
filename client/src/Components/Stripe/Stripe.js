import React, { useState } from "react";
import apple from "./img/applegoogle.svg";
import { useLocation } from "react-router-dom";
import visa from "./img/visa.svg";
import mastercard from "./img/mastercard.svg";
import americanexpress from "./img/americanexpress.svg";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import "./Stripe.scss";
import { useStore } from "../../utils/store";

function CheckOutHandle(
  firstname,
  lastname,
  email,
  challengeId,
  userId,
  couponCode
) {
  toast.loading("Bis gleich.");
  fetch(
    `${
      process.env.NODE_ENV === "production"
        ? "api"
        : "http://localhost:5001/api"
    }/stripe/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: "HiLife Challenge",
        firstname: firstname,
        lastname: lastname,
        email: email,
        challengeId: challengeId,
        userId: userId,
        coupon: couponCode,
      }),
    }
  )
    .then((res) => {
      if (res.ok) return res.json();
      return res.json().then((json) => Promise.reject(json));
    })
    .then((response) => {
      // If the response contains a URL, redirect to that URL
      if (response.url) {
        window.location = response.url;
      } else {
        // If the response doesn't contain a URL (which would be the case for 100% off coupons), redirect to your success page directly
        window.location = `/paid`;
      }
    })
    .catch((e) => {
      console.error(e.error);
      toast.dismiss(); // Dismiss the loading toast
      toast.error("Ungültiger Gutscheincode"); // Show an error toast
    });
}

function Stripe() {
  const [user, setUser] = useStore((state) => [state.user, state.setUser]);
  const location = useLocation();
  const challengeId = location.state.challengeId;
  const userId = location.state.userId;
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");

  return (
    <div className="stripe">
      <Toaster />
      <div className="stripe-checkout-images">
        <img src={apple} alt="" className="stripe-checkout-image" />
        <img src={visa} alt="" className="stripe-checkout-image" />
        <img src={mastercard} alt="" className="stripe-checkout-image" />
        <img src={americanexpress} alt="" className="stripe-checkout-image" />
      </div>
      <p className="stripe-checkout-title">
        Wenn Du einen Gutscheincode hast, gib ihn hier ein:
      </p>
      <input
        type="text"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        placeholder="Gutschein Code"
        className="stripe-checkout-code"
      />
      <button
        className="stripe-checkout"
        onClick={() =>
          CheckOutHandle(
            user.firstname,
            user.lastname,
            user.email,
            challengeId,
            userId,
            couponCode
          )
        }
      >
        WEITER ZUR ZAHLUNG
      </button>
    </div>
  );
}

export default Stripe;
