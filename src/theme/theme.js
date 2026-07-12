import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Palette values for light mode
          primary: {
            main: '#4f46e5', // Deep indigo
            light: '#6366f1',
            dark: '#3730a3',
            contrastText: '#fff',
          },
          secondary: {
            main: '#10b981', // Emerald
            light: '#34d399',
            dark: '#047857',
            contrastText: '#fff',
          },
          background: {
            default: '#f8fafc', // Soft slate
            paper: '#ffffff',
            card: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#475569',
          },
          divider: '#e2e8f0',
        }
      : {
          // Palette values for dark mode
          primary: {
            main: '#818cf8', // Bright indigo
            light: '#a5b4fc',
            dark: '#4f46e5',
            contrastText: '#0f172a',
          },
          secondary: {
            main: '#34d399', // Bright emerald
            light: '#6ee7b7',
            dark: '#059669',
            contrastText: '#0f172a',
          },
          background: {
            default: '#070a13', // Ultra dark blue/grey
            paper: '#0f1524',
            card: 'rgba(15, 21, 36, 0.8)', // Glassmorphism base
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
          divider: 'rgba(148, 163, 184, 0.12)',
        }),
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 12,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          background: mode === 'dark' 
            ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' 
            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#fff',
          '&:hover': {
            background: mode === 'dark' 
              ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
              : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          }
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? 'rgba(15, 21, 36, 0.6)' : '#ffffff',
          backdropFilter: mode === 'dark' ? 'blur(12px)' : 'none',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: mode === 'dark' 
            ? '0 10px 30px -10px rgba(0,0,0,0.5)' 
            : '0 10px 30px -10px rgba(79, 70, 229, 0.05)',
          borderRadius: 20,
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? 'rgba(7, 10, 19, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: 'none',
          color: mode === 'dark' ? '#f8fafc' : '#0f172a',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: mode === 'dark' ? 'rgba(15, 21, 36, 0.9)' : '#f8fafc',
        }
      }
    }
  }
});

export const getTheme = (mode) => createTheme(getDesignTokens(mode));
export default getTheme;
