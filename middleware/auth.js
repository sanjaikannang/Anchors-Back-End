import jwt from "jsonwebtoken";

const auth = async (req, res, next) => {
  try {
    // Get the JWT token from the request headers
    const token = req.headers["x-auth-token"];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token not provided" });
    }

    // Verify the JWT token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user information in the request
    req.user = decodedToken;
    
    // Set user ID in the request
    req.userId = decodedToken.id;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default auth;
