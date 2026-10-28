import { Dashboard } from "./pages/Dashboard";
import { useTheme } from "./hooks/useTheme";

function App() {
  const [theme, toggleTheme] = useTheme();
  return <Dashboard theme={theme} onToggleTheme={toggleTheme} />;
}

export default App;
