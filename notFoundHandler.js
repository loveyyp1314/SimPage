const path = require("path");

function createNotFoundHandler(indexFilePath) {
  const resolvedIndexPath = path.resolve(indexFilePath);

  return (req, res) => {
    const isApiRequest = req.path === "/api" || req.path.startsWith("/api/");
    if (isApiRequest) {
      res.status(404).json({ success: false, message: "未找到资源" });
      return;
    }

    if (req.method === "GET") {
      res.sendFile(resolvedIndexPath);
      return;
    }

    res.status(404).json({ success: false, message: "未找到资源" });
  };
}

module.exports = { createNotFoundHandler };
