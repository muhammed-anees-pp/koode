import AppRoutes from "./AppRoutes";
import AuthInitializer from "./AuthInitializer";
import NotificationInitializer from "./NotificationInitializer";

const App = () => {
  return (
    <AuthInitializer>
      <NotificationInitializer />
      <AppRoutes />
    </AuthInitializer>
  );
};

export default App;
