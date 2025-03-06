import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiTicketLine,
  RiPaletteLine,
  RiTimeLine,
  RiCalendarEventLine,
  RiPriceTag3Line,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiInformationLine,
  RiImageLine,
  RiLockLine,
  RiLockUnlockLine,
  RiUserLine,
  RiGroupLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiSaveLine,
  RiAlarmLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "react-icons/ri";
import "./TicketCodeSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import CreateTicketDialog from "../CreateTicketDialog/CreateTicketDialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TicketCodeSettings = ({ event, codeSetting, onSave, onCancel }) => {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketToEdit, setTicketToEdit] = useState(null);
  const [expandedTickets, setExpandedTickets] = useState({});

  useEffect(() => {
    fetchTickets();
  }, [event._id, codeSetting._id]);

  const fetchTickets = async () => {
    try {
      const response = await axiosInstance.get(
        `/ticket-settings/events/${event._id}`
      );
      setTickets(response.data.ticketSettings || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.showError("Failed to load tickets");
    }
  };

  const handleAddTicket = () => {
    setTicketToEdit(null);
    setShowCreateDialog(true);
  };

  const handleEditTicket = (ticket) => {
    setTicketToEdit(ticket);
    setShowCreateDialog(true);
  };

  const handleDeleteTicket = (ticket) => {
    setActiveTicket(ticket._id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTicket = async () => {
    try {
      const response = await axiosInstance.delete(
        `/ticket-settings/events/${event._id}/${activeTicket}`
      );

      if (response.data.ticketSettings) {
        setTickets(response.data.ticketSettings);
      } else {
        setTickets(tickets.filter((ticket) => ticket._id !== activeTicket));
      }

      setShowDeleteDialog(false);
      setActiveTicket(null);
      toast.showSuccess("Ticket deleted successfully");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.showError("Failed to delete ticket");
    }
  };

  const handleSaveTicket = async (ticketData) => {
    try {
      let response;

      // Combine date and time for endDate if hasCountdown is true
      if (ticketData.hasCountdown && ticketData.endDate && ticketData.endTime) {
        const [year, month, day] = (
          ticketData.endDate instanceof Date
            ? ticketData.endDate.toISOString().split("T")[0]
            : ticketData.endDate
        ).split("-");
        const [hours, minutes] = ticketData.endTime.split(":");

        const combinedDate = new Date(year, month - 1, day, hours, minutes);
        ticketData.endDate = combinedDate.toISOString();
      }

      // Remove endTime as it's not in the backend model
      const { endTime, ...dataToSend } = ticketData;

      if (ticketToEdit) {
        // Update existing ticket
        response = await axiosInstance.put(
          `/ticket-settings/events/${event._id}/${ticketToEdit._id}`,
          dataToSend
        );
      } else {
        // Create new ticket
        response = await axiosInstance.post(
          `/ticket-settings/events/${event._id}`,
          dataToSend
        );
      }

      if (response.data.ticketSettings) {
        setTickets(response.data.ticketSettings);
        toast.showSuccess(
          ticketToEdit
            ? "Ticket updated successfully"
            : "Ticket added successfully"
        );
      }

      setShowCreateDialog(false);
      setTicketToEdit(null);
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.showError(error.response?.data?.message || "Failed to save ticket");
    }
  };

  const toggleTicketDetails = (ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const renderTicketList = () => {
    return (
      <div className="ticket-list">
        <div className="add-ticket-container">
          <button
            className="add-ticket-button"
            onClick={handleAddTicket}
            title="Add Ticket"
          >
            <RiAddLine />
          </button>
        </div>
        <div className="tickets-container">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="ticket-item"
              style={{
                borderLeft: `4px solid ${ticket.color || "#2196F3"}`,
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 0 4px ${
                  ticket.color || "#2196F3"
                }10`,
              }}
            >
              <div className="ticket-header">
                <div className="ticket-title">
                  <h4>{ticket.name}</h4>
                  <div className="ticket-price">
                    <span
                      className="current-price"
                      style={{ color: ticket.color || "#2196F3" }}
                    >
                      {typeof ticket.price === "number"
                        ? ticket.price.toFixed(2)
                        : parseFloat(ticket.price).toFixed(2)}
                      €
                    </span>
                    {ticket.originalPrice && (
                      <span className="original-price">
                        {typeof ticket.originalPrice === "number"
                          ? ticket.originalPrice.toFixed(2)
                          : parseFloat(ticket.originalPrice).toFixed(2)}
                        €
                      </span>
                    )}
                  </div>
                </div>
                <div className="ticket-actions">
                  <button
                    onClick={() => handleEditTicket(ticket)}
                    title="Edit Ticket"
                  >
                    <RiEditLine />
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTicket(ticket)}
                    title="Delete Ticket"
                  >
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedTickets[ticket._id] && (
                  <motion.div
                    className="ticket-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {ticket.description && (
                      <div className="detail-item">
                        <RiInformationLine />
                        <div className="detail-content">
                          <div className="label">Description</div>
                          <div className="value">{ticket.description}</div>
                        </div>
                      </div>
                    )}
                    {ticket.hasCountdown && ticket.endDate && (
                      <div className="detail-item">
                        <RiTimeLine />
                        <div className="detail-content">
                          <div className="label">Ends</div>
                          <div className="value">
                            {new Date(ticket.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {ticket.isLimited && (
                      <div className="detail-item">
                        <RiGroupLine />
                        <div className="detail-content">
                          <div className="label">Availability</div>
                          <div className="value">
                            {ticket.soldCount}/{ticket.maxTickets} sold
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="detail-item">
                      <RiUserLine />
                      <div className="detail-content">
                        <div className="label">Purchase Limits</div>
                        <div className="value">
                          {ticket.minPurchase} - {ticket.maxPurchase} per order
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* <motion.button
                className="toggle-details-button"
                onClick={() => toggleTicketDetails(ticket._id)}
                whileHover={{ y: expandedTickets[ticket._id] ? -2 : 2 }}
                whileTap={{ scale: 0.95 }}
              >
                {expandedTickets[ticket._id] ? (
                  <RiArrowUpLine />
                ) : (
                  <RiArrowDownLine />
                )}
              </motion.button> */}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="ticket-code-settings">
      {renderTicketList()}

      <AnimatePresence>
        {showCreateDialog && (
          <CreateTicketDialog
            onClose={() => setShowCreateDialog(false)}
            onSave={handleSaveTicket}
            initialData={ticketToEdit || {}}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Ticket"
          message="Are you sure you want to delete this ticket? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteTicket}
          onCancel={() => setShowDeleteDialog(false)}
          isDangerous={true}
        />
      )}
    </div>
  );
};

export default TicketCodeSettings;
