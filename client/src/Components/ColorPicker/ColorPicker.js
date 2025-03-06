import React, { useState, useEffect } from "react";
import "./ColorPicker.scss";

const ColorPicker = ({ color, onChange, onClose, title = "Select Color" }) => {
  const [selectedColor, setSelectedColor] = useState(color);
  const [rgbValues, setRgbValues] = useState({ r: 0, g: 0, b: 0 });
  const [hexValue, setHexValue] = useState(color);

  const presetColors = [
    "#2196F3", // Blue
    "#4CAF50", // Green
    "#FFC107", // Amber
    "#F44336", // Red
    "#9C27B0", // Purple
    "#009688", // Teal
    "#FF5722", // Deep Orange
    "#795548", // Brown
    "#607D8B", // Blue Grey
    "#E91E63", // Pink
    "#673AB7", // Deep Purple
    "#3F51B5", // Indigo
    "#00BCD4", // Cyan
    "#8BC34A", // Light Green
    "#CDDC39", // Lime
    "#FF9800", // Orange
  ];

  useEffect(() => {
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbValues(rgb);
    }
  }, [color]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = Math.max(0, Math.min(255, n)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleRgbChange = (component, value) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(255, numValue));

    const newRgb = {
      ...rgbValues,
      [component]: clampedValue,
    };

    setRgbValues(newRgb);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexValue(newHex);
    setSelectedColor(newHex);
  };

  const handleHexChange = (hex) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setHexValue(hex);
      setSelectedColor(hex);
      const rgb = hexToRgb(hex);
      if (rgb) {
        setRgbValues(rgb);
      }
    } else {
      setHexValue(hex);
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setHexValue(color);
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbValues(rgb);
    }
  };

  const handleApply = () => {
    onChange(selectedColor);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="color-picker-overlay" onClick={handleOverlayClick}>
      <div className="color-picker-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="color-picker-header">
          <h3>{title}</h3>
        </div>

        <div className="color-picker-content">
          <div className="color-inputs">
            <div className="hex-input">
              <label>HEX</label>
              <input
                type="text"
                value={hexValue}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                spellCheck={false}
              />
            </div>
            <div className="rgb-inputs">
              <div className="rgb-input">
                <label>R</label>
                <input
                  type="number"
                  value={rgbValues.r}
                  onChange={(e) => handleRgbChange("r", e.target.value)}
                  min={0}
                  max={255}
                />
              </div>
              <div className="rgb-input">
                <label>G</label>
                <input
                  type="number"
                  value={rgbValues.g}
                  onChange={(e) => handleRgbChange("g", e.target.value)}
                  min={0}
                  max={255}
                />
              </div>
              <div className="rgb-input">
                <label>B</label>
                <input
                  type="number"
                  value={rgbValues.b}
                  onChange={(e) => handleRgbChange("b", e.target.value)}
                  min={0}
                  max={255}
                />
              </div>
            </div>
          </div>

          <div
            className="color-preview"
            style={{ backgroundColor: selectedColor }}
          >
            <div className="color-value">{selectedColor}</div>
          </div>

          <div className="preset-colors">
            <label>Preset Colors</label>
            <div className="color-grid">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  className={`color-option ${
                    selectedColor === color ? "selected" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="color-picker-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="apply-button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
