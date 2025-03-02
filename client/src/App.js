import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";

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
import Dropbox from "./Components/Dropbox/Dropbox";
// import FriendsCode from './Components/FriendsCode/FriendsCode';
import Inbox from "./Components/Inbox/Inbox";
import PersonalChat from "./Components/PersonalChat/PersonalChat";
import Brands from "./Components/Brands/Brands";
import Locations from "./Components/Locations/Locations";

function App() {
  const eventId = "8r0xqv1s";

  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Toaster position="top-center" />

            <Routes>
              <Route path="/" element={<EventPage passedEventId={eventId} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard/*" element={<Dashboard />}>
                <Route path="chat/:chatId" element={<PersonalChat />} />
              </Route>
              <Route
                path="/registration-success"
                element={<RegistrationSuccess />}
              />
              <Route path="/verify/:token" element={<EmailVerification />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/create" element={<CreateEvent />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/events/page/:eventId" element={<EventPage />} />
              <Route
                path="/guest-code-settings"
                element={<GuestCodeSettings />}
              />
              <Route
                path="/upload"
                element={<DropFiles showDashboard={false} />}
              />
              <Route path="/share" element={<RedirectToDropbox />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/locations" element={<Locations />} />
            </Routes>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

const RedirectToDropbox = () => {
  useEffect(() => {
    window.location.href =
      "https://www.dropbox.com/scl/fo/zc0xkjehm2mvvc2ghvcd0/ABs7kH9Qc7gOATiWFgrtPaI?rlkey=9qlurwsjbgcy4srvek6nxxen3&st=nempmga1&dl=0";
  }, []);

  return null; // Return null since no UI is rendered
};

export default App;
