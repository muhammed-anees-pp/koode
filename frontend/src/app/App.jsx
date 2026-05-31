import AppRoutes from "./AppRoutes";
import AuthInitializer from "./AuthInitializer";
import NotificationInitializer from "./NotificationInitializer";
import NotificationToasts from "../components/notifications/NotificationToasts";

const App = () => {
  return (
    <AuthInitializer>
      <NotificationInitializer />
      <NotificationToasts />
      <AppRoutes />
    </AuthInitializer>
  );
};

export default App;
