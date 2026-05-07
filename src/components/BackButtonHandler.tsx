import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";

export const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      const path = location.pathname;

      if (path === "/") {
        // On home page, exit the app
        await App.exitApp();
      } else {
        // On any other page, go back to home
        navigate("/", { replace: true });
      }
    };

    const listener = App.addListener("backButton", handleBackButton);

    return () => {
      listener.then((l) => l.remove());
    };
  }, [location, navigate]);

  return null;
};
