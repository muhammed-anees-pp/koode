import AppRoutes from "./AppRoutes";
import AuthInitializer from "./AuthInitializer";

const App = () => {
  return (
    <AuthInitializer>
      <AppRoutes />
    </AuthInitializer>
  );
};

export default App;
