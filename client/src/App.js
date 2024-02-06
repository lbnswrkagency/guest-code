import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";

import Dashboard from "./Components/Dashboard/Dashboard";
import Home from "./Components/Home/Home";
import Login from "./Components/AuthForm/Login/Login";
import Register from "./Components/AuthForm/Register/Register";
import EmailVerification from "./Components/EmailVerification/EmailVerification";
import RegistrationSuccess from "./Components/RegistrationSuccess/RegistrationSuccess";
import Events from "./Components/Events/Events";
import CreateEvent from "./Components/CreateEvent/CreateEvent";
import EventDetails from "./Components/EventDetails/EventDetails";
import EventPage from "./Components/EventPage/EventPage";
import GuestCodeSettings from "./Components/GuestCodeSettings/GuestCodeSettings";
import DropFiles from "./Components/DropFiles/DropFiles";
// import FriendsCode from './Components/FriendsCode/FriendsCode';

function App() {
  const eventId = "31vp88ph";

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<EventPage passedEventId={eventId} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* <Route path="/dashboard/friendscode" element={<FriendsCode />} /> */}
          <Route
            path="/registration-success"
            element={<RegistrationSuccess />}
          />
          <Route path="/verify/:token" element={<EmailVerification />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<CreateEvent />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/events/page/:eventId" element={<EventPage />} />
          <Route path="/guest-code-settings" element={<GuestCodeSettings />} />
          <Route path="/upload" element={<DropFiles showDashboard={false} />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
