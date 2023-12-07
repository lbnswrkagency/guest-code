import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "react-toastify";
import "./Scanner.scss";

function Scanner() {
  const [scanResult, setScanResult] = useState("");
  const [paxChecked, setPaxChecked] = useState(0);
  const [scanning, setScanning] = useState(true);

  const handleScan = (decodedText, decodedResult) => {
    setScanResult(decodedText);
    setScanning(false); // Pause scanning
    // TODO: Send request to backend to validate ticket
    toast.success("Successfully scanned");
  };

  const handleError = (err) => {
    console.error(err);
    toast.error("Scanning error");
  };

  useEffect(() => {
    let qrCodeScanner;

    if (scanning) {
      qrCodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );
      qrCodeScanner.render(handleScan, handleError);
    }

    return () => {
      if (qrCodeScanner) {
        qrCodeScanner.clear();
      }
    };
  }, [scanning]);

  return (
    <div className="scanner">
      {scanning ? (
        <div id="qr-reader" style={{ width: "500px" }}></div>
      ) : (
        <div>
          <p>Scanned Result: {scanResult}</p>
          <button onClick={() => setScanning(true)}>Scan Again</button>
        </div>
      )}
      <div>
        <button onClick={() => setPaxChecked(paxChecked - 1)}>Decrease</button>
        <span>Pax Checked: {paxChecked}</span>
        <button onClick={() => setPaxChecked(paxChecked + 1)}>Increase</button>
      </div>
    </div>
  );
}

export default Scanner;
