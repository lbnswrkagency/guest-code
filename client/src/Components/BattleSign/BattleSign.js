import React from "react";
import "./BattleSign.scss";

function BattleSign() {
  return (
    <div className="battleSign">
      <h1 className="battleSign-title">SPITIX BEACH BATTLE</h1>
      <p className="battleSign-text">
        Sign up for our Urban Dance Battle at the beach. Each Categories winner
        wins 333€, the crowed decides the winner!
      </p>

      <div className="battleSign-form">
        <ratio>All Styles</ratio>
        <ratio>Afro Styles</ratio>
        <ratio>Dancehall</ratio>

        <input type="text" placeholder="" className="battleSign-form-name" />
        <input
          type="text"
          placeholder="Phone"
          className="battleSign-form-phone"
        />
        <input
          type="text"
          placeholder="Email"
          className="battleSign-form-email"
        />
        <textarea
          name=""
          id=""
          placeholder="Anything else you want us to know?"
          className="battleSign-form-text"
        ></textarea>
      </div>
    </div>
  );
}

export default BattleSign;
