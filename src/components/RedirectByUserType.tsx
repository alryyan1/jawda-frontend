import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const RedirectByUserType: React.FC = () => {
  const { user } = useAuth();

  const userType = user?.user_type?.trim();
  let to = "/clinic";

  if (userType === "استقبال معمل") {
    to = "/lab-reception";
  } else if (userType === "ادخال نتائج") {
    to = "/lab-workstation";
  } else {
    to = "/clinic";
  }

  return <Navigate to={to} replace />;
};

export default RedirectByUserType;


