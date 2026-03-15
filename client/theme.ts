import { createTheme } from "@mui/material/styles";

export const moonlightTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7c9fd4",
      light: "#9bb8e8",
      dark: "#5a7ba8",
    },
    secondary: {
      main: "#89b4fa",
    },
    background: {
      default: "#1a1b26",
      paper: "#24283b",
    },
    text: {
      primary: "#c0caf5",
      secondary: "#a9b1d6",
      disabled: "#565f89",
    },
    success: {
      main: "#9ece6a",
    },
    error: {
      main: "#f7768e",
    },
    warning: {
      main: "#e0af68",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});
