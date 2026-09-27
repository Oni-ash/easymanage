'use client';

import { createTheme } from '@mui/material/styles';

// Colors from the Material Design 3 baseline palette
const theme = createTheme({
  palette: {
    primary:    { main: '#6750A4' },   // M3 primary purple
    secondary:  { main: '#625B71' },   // M3 secondary
    background: { default: '#FEF7FF', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 16 },          // M3 uses generous rounding
});

export default theme;