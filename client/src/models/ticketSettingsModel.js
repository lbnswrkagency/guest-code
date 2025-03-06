/**
 * Ticket Settings Model
 *
 * This model defines the structure and validation for ticket settings
 * associated with events.
 */

class TicketSettingsModel {
  constructor(data = {}) {
    this._id = data._id || null;
    this.eventId = data.eventId || null;
    this.name = data.name || "";
    this.price = data.price !== undefined ? parseFloat(data.price) : 0;
    this.originalPrice = data.originalPrice
      ? parseFloat(data.originalPrice)
      : null;
    this.description = data.description || "";
    this.color = data.color || "#2196F3";
    this.hasCountdown = data.hasCountdown || false;
    this.endDate = data.endDate ? new Date(data.endDate) : null;
    this.maxPurchases = data.maxPurchases || 0;
    this.isLimited = data.isLimited || false;
    this.maxTickets = data.maxTickets || 100;
    this.isVisible = data.isVisible !== undefined ? data.isVisible : true;
    this.requiresApproval = data.requiresApproval || false;
    this.minPurchase = data.minPurchase || 1;
    this.maxPurchase = data.maxPurchase || 10;
    this.soldCount = data.soldCount || 0;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  /**
   * Validates the ticket settings data
   * @returns {Object} Object with isValid flag and any validation errors
   */
  validate() {
    const errors = {};

    // Name validation
    if (!this.name.trim()) {
      errors.name = "Ticket name is required";
    } else if (this.name.length > 50) {
      errors.name = "Ticket name cannot exceed 50 characters";
    }

    // Price validation
    if (this.price === undefined || this.price === null || isNaN(this.price)) {
      errors.price = "Valid price is required";
    } else if (this.price < 0) {
      errors.price = "Price cannot be negative";
    }

    // Original price validation
    if (
      this.originalPrice !== null &&
      (isNaN(this.originalPrice) || this.originalPrice < 0)
    ) {
      errors.originalPrice = "Original price cannot be negative";
    }

    // Description validation
    if (this.description && this.description.length > 500) {
      errors.description = "Description cannot exceed 500 characters";
    }

    // End date validation
    if (this.hasCountdown && !this.endDate) {
      errors.endDate = "End date is required when countdown is enabled";
    } else if (this.hasCountdown && this.endDate < new Date()) {
      errors.endDate = "End date cannot be in the past";
    }

    // Max tickets validation
    if (
      this.isLimited &&
      (!Number.isInteger(this.maxTickets) || this.maxTickets <= 0)
    ) {
      errors.maxTickets = "Maximum tickets must be a positive integer";
    }

    // Min/Max purchase validation
    if (!Number.isInteger(this.minPurchase) || this.minPurchase <= 0) {
      errors.minPurchase = "Minimum purchase must be a positive integer";
    }

    if (!Number.isInteger(this.maxPurchase) || this.maxPurchase <= 0) {
      errors.maxPurchase = "Maximum purchase must be a positive integer";
    }

    if (this.minPurchase > this.maxPurchase) {
      errors.minPurchase =
        "Minimum purchase cannot be greater than maximum purchase";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Converts the model to a plain object for API requests
   * @returns {Object} Plain object representation of the ticket settings
   */
  toJSON() {
    return {
      _id: this._id,
      eventId: this.eventId,
      name: this.name,
      price: this.price,
      originalPrice: this.originalPrice,
      description: this.description,
      color: this.color,
      hasCountdown: this.hasCountdown,
      endDate: this.endDate,
      maxPurchases: this.maxPurchases,
      isLimited: this.isLimited,
      maxTickets: this.maxTickets,
      isVisible: this.isVisible,
      requiresApproval: this.requiresApproval,
      minPurchase: this.minPurchase,
      maxPurchase: this.maxPurchase,
      soldCount: this.soldCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Calculates if the ticket is on sale
   * @returns {Boolean} Whether the ticket is on sale
   */
  isOnSale() {
    return this.originalPrice !== null && this.originalPrice > this.price;
  }

  /**
   * Calculates the discount percentage if the ticket is on sale
   * @returns {Number|null} Discount percentage or null if not on sale
   */
  getDiscountPercentage() {
    if (!this.isOnSale()) return null;
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }

  /**
   * Checks if the ticket is available for purchase
   * @returns {Boolean} Whether the ticket is available
   */
  isAvailable() {
    if (!this.isVisible) return false;

    // Check if countdown has expired
    if (this.hasCountdown && this.endDate && new Date() > this.endDate) {
      return false;
    }

    // Check if limited quantity is sold out
    if (this.isLimited && this.soldCount >= this.maxTickets) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the remaining tickets if limited
   * @returns {Number|null} Number of remaining tickets or null if unlimited
   */
  getRemainingTickets() {
    if (!this.isLimited) return null;
    return Math.max(0, this.maxTickets - this.soldCount);
  }

  /**
   * Calculates the percentage of tickets sold
   * @returns {Number|null} Percentage of tickets sold or null if unlimited
   */
  getSoldPercentage() {
    if (!this.isLimited || this.maxTickets === 0) return null;
    return Math.min(100, Math.round((this.soldCount / this.maxTickets) * 100));
  }
}

export default TicketSettingsModel;
