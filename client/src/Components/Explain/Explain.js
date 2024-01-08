import React, { useState } from "react";
import "./Explain.scss";

function Explain() {
  const [showMore, setShowMore] = useState(false);

  const toggleExplainMore = () => {
    setShowMore(!showMore);
  };
  return (
    <div className="explain">
      <div className="explain-wrapper">
        <div className="explain-header">
          <h1 className="explain-header-title">HOW DOES IT WORK</h1>
          <h2 className="explain-header-subtitle">GUEST CODE?</h2>
        </div>

        <div className={`explain-more ${showMore ? "visible" : ""}`}>
          <div className="explain-more-bullet">
            <p>Generate Guest Code</p>
            <img src="./image/qrcode.svg" alt="" />
          </div>
          <div className="explain-more-bullet">
            <p>Scan at Entrance</p>
            <img src="./image/scan.svg" alt="" />
          </div>
          <div className="explain-more-bullet">
            <p>Have fun!</p>
            <img src="./image/havefun.svg" alt="" />
          </div>
        </div>
        <div className="explain-navigation" onClick={toggleExplainMore}>
          <p>{showMore ? "SHOW LESS" : "SHOW MORE"}</p>
          <img
            src={showMore ? "./image/arrowup.svg" : "./image/arrowdown.svg"}
            alt=""
          />
        </div>
      </div>
    </div>
  );
}

export default Explain;
