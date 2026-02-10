import React, { useState, useEffect, useContext } from "react";
import "./TicketTemplates.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTicketLine,
  RiAddCircleLine,
  RiDeleteBin6Line,
  RiBuildingLine,
  RiPriceTag3Line,
  RiTimeLine,
  RiGroupLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import AuthContext from "../../contexts/AuthContext";
import { useToast } from "../Toast/ToastContext";
import Navigation from "../Navigation/Navigation";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import TicketDetailPanel from "../TicketDetailPanel/TicketDetailPanel";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

const TicketTemplates = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const toast = useToast();

  const [tickets, setTickets] = useState([]);
  const [userBrands, setUserBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  // Fetch user's ticket templates and brands
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // First fetch user's brands
      const brandsResponse = await axiosInstance.get("/brands");
      const allBrands = brandsResponse.data || [];

      // Filter to only brands where user is the FOUNDER/OWNER
      // Users can only attach ticket templates to brands they own
      const ownedBrands = allBrands.filter(brand =>
        brand.owner === user?._id ||
        brand.owner?.toString() === user?._id?.toString() ||
        brand.role?.isFounder === true
      );
      setUserBrands(ownedBrands);

      // Fetch brand-level tickets only for brands the user owns
      const allTickets = [];
      for (const brand of ownedBrands) {
        try {
          const ticketsResponse = await axiosInstance.get(`/ticket-settings/brands/${brand._id}/tickets`);
          // Add brand info to each ticket
          for (const ticket of ticketsResponse.data.tickets || []) {
            allTickets.push({
              ...ticket,
              brandId: brand._id,
              brandName: brand.name,
              brandUsername: brand.username,
              brandLogo: brand.logo,
            });
          }
        } catch (error) {
          console.log(`Failed to fetch tickets for brand ${brand.name}:`, error.message);
        }
      }

      // Also fetch user-level tickets (no brand attached)
      let userLevelTickets = [];
      try {
        const userTicketsResponse = await axiosInstance.get("/ticket-settings/user/tickets");
        userLevelTickets = userTicketsResponse.data.tickets || [];
      } catch (error) {
        console.log("Failed to fetch user-level tickets:", error.message);
      }

      // Group tickets by name to merge attachments (tickets with same name across brands)
      const ticketsByName = {};

      // First, add user-level tickets (no brand attachment)
      for (const ticket of userLevelTickets) {
        ticketsByName[ticket.name] = {
          ...ticket,
          attachments: [],
          ticketIdsByBrand: {},
          userLevelTicketId: ticket._id, // Track the user-level ticket ID
        };
      }

      // Then merge brand-level tickets
      for (const ticket of allTickets) {
        if (!ticketsByName[ticket.name]) {
          ticketsByName[ticket.name] = {
            ...ticket,
            attachments: [],
            ticketIdsByBrand: {},
          };
        }
        // Add this brand as an attachment
        ticketsByName[ticket.name].attachments.push({
          brandId: ticket.brandId,
          brandName: ticket.brandName,
          brandUsername: ticket.brandUsername,
          brandLogo: ticket.brandLogo,
          isGlobalForBrand: ticket.isGlobalForBrand !== false,
        });
        // Track the ticket ID for this brand
        ticketsByName[ticket.name].ticketIdsByBrand[ticket.brandId] = ticket._id;
      }

      setTickets(Object.values(ticketsByName));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/@${user?.username}`);
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowNewForm(false);
  };

  const handleNewTicket = () => {
    setSelectedTicket(null);
    setShowNewForm(true);
  };

  const handleCloseDetail = () => {
    setSelectedTicket(null);
    setShowNewForm(false);
  };

  const handleSave = async (ticketData) => {
    try {
      const attachments = ticketData.attachments || [];

      if (selectedTicket) {
        // EDITING an existing ticket
        const oldBrandIds = new Set(
          selectedTicket.attachments?.map(a => a.brandId) || []
        );
        const newBrandIds = new Set(attachments.map(a => a.brandId));

        // Delete removed brand attachments
        for (const brandId of oldBrandIds) {
          if (!newBrandIds.has(brandId)) {
            const ticketId = selectedTicket.ticketIdsByBrand?.[brandId];
            if (ticketId) {
              await axiosInstance.delete(`/ticket-settings/brands/${brandId}/tickets/${ticketId}`);
            }
          }
        }

        if (attachments.length === 0) {
          // No brands attached — save/update as user-level ticket
          if (selectedTicket.userLevelTicketId) {
            // Update existing user-level ticket
            await axiosInstance.put(
              `/ticket-settings/user/tickets/${selectedTicket.userLevelTicketId}`,
              ticketData
            );
          } else {
            // Create new user-level ticket
            await axiosInstance.post("/ticket-settings/user/tickets", ticketData);
          }
        } else {
          // Has brand attachments — delete user-level version if it existed
          if (selectedTicket.userLevelTicketId) {
            try {
              await axiosInstance.delete(`/ticket-settings/user/tickets/${selectedTicket.userLevelTicketId}`);
            } catch (e) {
              // User-level ticket may already be gone
            }
          }

          // Update existing / Create new brand-level tickets
          for (const attachment of attachments) {
            const brandId = attachment.brandId;
            const existingTicketId = selectedTicket.ticketIdsByBrand?.[brandId];

            if (existingTicketId) {
              await axiosInstance.put(
                `/ticket-settings/brands/${brandId}/tickets/${existingTicketId}`,
                { ...ticketData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
              );
            } else {
              await axiosInstance.post(
                `/ticket-settings/brands/${brandId}/tickets`,
                { ...ticketData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
              );
            }
          }
        }

        toast.showSuccess("Ticket updated");
      } else {
        // CREATING a new ticket
        if (attachments.length === 0) {
          // No brand — save as user-level ticket
          await axiosInstance.post("/ticket-settings/user/tickets", ticketData);
        } else {
          // Has brands — create one TicketSettings per brand
          for (const attachment of attachments) {
            await axiosInstance.post(
              `/ticket-settings/brands/${attachment.brandId}/tickets`,
              { ...ticketData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
            );
          }
        }
        toast.showSuccess("Ticket created");
      }

      // Refresh data to get updated state
      await fetchData();
      handleCloseDetail();
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to save ticket"
      );
    }
  };

  const handleDeleteClick = (e, ticket) => {
    e.stopPropagation();
    setTicketToDelete(ticket);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;

    try {
      // Delete from ALL brands this ticket is attached to
      const attachments = ticketToDelete.attachments || [];
      const ticketIdsByBrand = ticketToDelete.ticketIdsByBrand || {};

      for (const attachment of attachments) {
        const ticketId = ticketIdsByBrand[attachment.brandId];
        if (ticketId) {
          await axiosInstance.delete(
            `/ticket-settings/brands/${attachment.brandId}/tickets/${ticketId}`
          );
        }
      }

      // Also delete user-level ticket if it exists
      if (ticketToDelete.userLevelTicketId) {
        await axiosInstance.delete(`/ticket-settings/user/tickets/${ticketToDelete.userLevelTicketId}`);
      }

      toast.showSuccess("Ticket deleted");

      // Refresh data to get updated state
      await fetchData();

      // Close detail panel if deleting the currently selected ticket
      if (selectedTicket?.name === ticketToDelete.name) {
        handleCloseDetail();
      }
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to delete ticket"
      );
    } finally {
      setShowDeleteConfirm(false);
      setTicketToDelete(null);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    if (price === 0) return "Free";
    return `${price.toFixed(2)}`;
  };

  return (
    <div className="page-wrapper">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
      />

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
        setUser={setUser}
      />

      <div className="ticket-templates">
        <div className="ticket-templates-header">
          <h1>Your Tickets</h1>
          <p>Create ticket templates and attach them to your brands & events</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="ticket-templates-loading-container">
            <LoadingSpinner size="large" color="primary" />
          </div>
        )}

        {/* No Tickets State */}
        {!loading && tickets.length === 0 && !showNewForm && (
          <div className="no-content-container">
            <div className="no-content-card">
              <RiTicketLine className="no-content-icon" />
              <h3>No Ticket Templates Yet</h3>
              <p>Create your first ticket template to get started</p>
              <motion.button
                className="create-ticket-btn"
                onClick={handleNewTicket}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RiAddCircleLine />
                Create Ticket Template
              </motion.button>
            </div>
          </div>
        )}

        {/* Tickets Grid */}
        {!loading && (tickets.length > 0 || showNewForm) && (
          <div className="ticket-templates-grid">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                isSelected={selectedTicket?._id === ticket._id}
                onClick={() => handleTicketClick(ticket)}
                onDelete={(e) => handleDeleteClick(e, ticket)}
                formatPrice={formatPrice}
              />
            ))}

            {/* Add New Card */}
            <motion.div
              className="ticket-card add-card"
              onClick={handleNewTicket}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <RiAddCircleLine className="add-icon" />
              <p>Create New Ticket</p>
            </motion.div>
          </div>
        )}

        {/* Detail Panel */}
        <AnimatePresence>
          {(selectedTicket || showNewForm) && (
            <TicketDetailPanel
              ticket={selectedTicket}
              userBrands={userBrands}
              onSave={handleSave}
              onClose={handleCloseDetail}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && ticketToDelete && (
          <ConfirmDialog
            title="Delete Ticket Template"
            message={`Are you sure you want to delete "${ticketToDelete.name}"? This will remove it from all brands and events.`}
            confirmText="Delete"
            type="danger"
            onConfirm={handleDelete}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setTicketToDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Ticket Card Component
const TicketCard = ({ ticket, isSelected, onClick, onDelete, formatPrice }) => {
  const attachmentCount = ticket.attachments?.length || 0;

  return (
    <motion.div
      className={`ticket-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="card-header">
        <div
          className="card-icon"
          style={{ backgroundColor: ticket.color || "#2196F3" }}
        >
          <RiTicketLine />
        </div>
        <div className="card-actions">
          <motion.button
            className="action-btn delete"
            onClick={onDelete}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RiDeleteBin6Line />
          </motion.button>
        </div>
      </div>

      <div className="card-content">
        <h3>{ticket.name}</h3>
        <div className="ticket-price">
          <RiPriceTag3Line />
          <span>{formatPrice(ticket.price || 0)}</span>
        </div>
        {ticket.description && (
          <p className="ticket-description">{ticket.description}</p>
        )}
      </div>

      <div className="card-footer">
        <div className="attachment-count">
          <RiBuildingLine />
          <span>
            {attachmentCount} {attachmentCount === 1 ? "brand" : "brands"}
          </span>
        </div>
        {ticket.isLimited && ticket.maxTickets && (
          <div className="ticket-limit">
            <RiGroupLine />
            <span>{ticket.maxTickets} max</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TicketTemplates;
