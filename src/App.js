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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />+
          <Route
            path="/registration-success"
            element={<RegistrationSuccess />}
          />
          <Route path="/verify/:token" element={<EmailVerification />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<CreateEvent />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/events/page/:eventId" element={<EventPage />} />;
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
