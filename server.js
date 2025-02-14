const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // Glitch provides a dynamic port

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Serve the main index.html file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
