import React, { useState, useEffect, useRef } from "react";
import "./ColorPicker.scss";

const ColorPicker = ({ color, onChange, onClose, title = "Select Color" }) => {
  const [selectedColor, setSelectedColor] = useState(color);
  const [rgbValues, setRgbValues] = useState({ r: 0, g: 0, b: 0 });
  const [hexValue, setHexValue] = useState(color);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  const colorFieldRef = useRef(null);
  const hueSliderRef = useRef(null);

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

  // Initialize HSL values from the initial color
  useEffect(() => {
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbValues(rgb);
      const hslValues = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hslValues.h);
      setSaturation(hslValues.s);
      setLightness(hslValues.l);
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

  // Convert RGB to HSL
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          h = 0;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
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

    // Update HSL values
    const hslValues = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    setHue(hslValues.h);
    setSaturation(hslValues.s);
    setLightness(hslValues.l);
  };

  const handleHexChange = (hex) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setHexValue(hex);
      setSelectedColor(hex);
      const rgb = hexToRgb(hex);
      if (rgb) {
        setRgbValues(rgb);
        // Update HSL values
        const hslValues = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setHue(hslValues.h);
        setSaturation(hslValues.s);
        setLightness(hslValues.l);
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
      // Update HSL values
      const hslValues = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hslValues.h);
      setSaturation(hslValues.s);
      setLightness(hslValues.l);
    }
  };

  const handleHueChange = (newHue) => {
    setHue(newHue);
    updateFromHSL(newHue, saturation, lightness);
  };

  const handleSLChange = (event) => {
    if (!colorFieldRef.current) return;

    const rect = colorFieldRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height)
    );

    const newSaturation = Math.round(x * 100);
    const newLightness = Math.round((1 - y) * 100);

    setSaturation(newSaturation);
    setLightness(newLightness);
    updateFromHSL(hue, newSaturation, newLightness);
  };

  // Add mouse drag handling for the color field
  const handleColorFieldMouseDown = (event) => {
    // Initial color selection
    handleSLChange(event);

    // Setup mouse move and mouse up listeners
    document.addEventListener("mousemove", handleSLChange);
    document.addEventListener("mouseup", handleColorFieldMouseUp);
  };

  const handleColorFieldMouseUp = () => {
    // Remove event listeners when mouse is released
    document.removeEventListener("mousemove", handleSLChange);
    document.removeEventListener("mouseup", handleColorFieldMouseUp);
  };

  const updateFromHSL = (h, s, l) => {
    const rgb = hslToRgb(h, s, l);
    setRgbValues(rgb);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexValue(hex);
    setSelectedColor(hex);
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
          {/* RGB color selector area */}
          <div className="color-field-container">
            <div
              className="color-field"
              ref={colorFieldRef}
              onMouseDown={handleColorFieldMouseDown}
              style={{
                background: `hsl(${hue}, 100%, 50%)`,
              }}
            >
              <div className="color-field-overlay">
                <div
                  className="color-field-cursor"
                  style={{
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="hue-slider-container">
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                className="hue-slider"
                ref={hueSliderRef}
                onChange={(e) => handleHueChange(parseInt(e.target.value))}
              />
            </div>
          </div>

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
