# Create basic directory structure
mkdir -p src/components public

# Create initial React files
echo 'import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);' > src/index.js

# Create App component
echo 'import "./App.css";
import EMDCalculator from "./components/EMDCalculator";

function App() {
  return (
    <div className="App">
      <EMDCalculator />
    </div>
  );
}

export default App;' > src/App.js

# Add CSS files with Tailwind
echo '@tailwind base;
@tailwind components;
@tailwind utilities;' > src/index.css

echo '.App {
  min-height: 100vh;
}' > src/App.css

# Create public/index.html
echo '<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EMD Calculator</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>' > public/index.html

# Add Tailwind config
echo 'module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}' > tailwind.config.js

echo 'module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}' > postcss.config.js
