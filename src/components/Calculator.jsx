import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Button, IconButton } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Calculator({ value, onChange, onConfirm }) {
  const [expression, setExpression] = useState(value ? String(value) : '0');

  const handleKeyPress = (key) => {
    setExpression((prev) => {
      let next = prev;

      if (key === 'C') {
        next = '0';
      } else if (key === 'backspace') {
        if (prev.length <= 1) {
          next = '0';
        } else {
          next = prev.slice(0, -1);
        }
      } else if (key === '=') {
        try {
          // Replace operators with safe math evaluation
          // Avoid eval() for security, use basic calculation or simple parser
          // For simplicity we evaluate basic expressions
          // Replace any trailing operators before evaluation
          let evalStr = prev.replace(/[x+\-/]*$/, '');
          evalStr = evalStr.replace(/x/g, '*');
          if (evalStr === '') evalStr = '0';
          const result = new Function(`return ${evalStr}`)();
          next = String(Number(result.toFixed(2)));
        } catch (e) {
          next = 'Error';
        }
      } else {
        // Prevent multiple decimals in one number
        const parts = prev.split(/[+\-x/]/);
        const lastPart = parts[parts.length - 1];
        if (key === '.' && lastPart.includes('.')) {
          return prev;
        }

        // Handle operator replacement
        const isOperator = ['+', '-', 'x', '/'].includes(key);
        const endsWithOperator = ['+', '-', 'x', '/'].includes(prev.slice(-1));

        if (prev === '0' && !isOperator && key !== '.') {
          next = key;
        } else if (prev === 'Error') {
          next = isOperator ? '0' + key : key;
        } else if (isOperator && endsWithOperator) {
          next = prev.slice(0, -1) + key;
        } else {
          next = prev + key;
        }
      }

      // Sync numeric value to parent if it's a valid number
      try {
        let cleanStr = next.replace(/x/g, '*');
        const calculated = new Function(`return ${cleanStr}`)();
        if (!isNaN(calculated) && isFinite(calculated)) {
          onChange(Math.max(0, calculated));
        }
      } catch (e) {}

      return next;
    });
  };

  const handleConfirm = () => {
    // Evaluate first if there's any active formula
    let finalVal = 0;
    try {
      let cleanStr = expression.replace(/[x+\-/]*$/, '').replace(/x/g, '*');
      const calculated = new Function(`return ${cleanStr}`)();
      if (!isNaN(calculated) && isFinite(calculated)) {
        finalVal = Math.max(0, calculated);
      }
    } catch (e) {}
    onConfirm(finalVal);
  };

  const buttons = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '0', '.'
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 5,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 30, 45, 0.4)' : '#f1f5f9',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      }}
    >
      <Box sx={{ mb: 2, textAlign: 'right' }}>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            minHeight: '28px',
            fontSize: '0.9rem',
            fontFamily: 'Outfit',
            letterSpacing: '1px'
          }}
        >
          {expression.match(/[+\-x/]/) ? expression : '\u00A0'}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            fontFamily: 'Outfit',
            color: 'primary.main',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          ₹{expression}
        </Typography>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1.25
      }}>
        {buttons.map((btn) => {
          const isOperator = ['/', 'x', '-', '+'].includes(btn);
          return (
            <Button
              key={btn}
              variant={isOperator ? 'contained' : 'outlined'}
              color={isOperator ? 'primary' : 'inherit'}
              onClick={() => handleKeyPress(btn)}
              sx={{
                height: '56px',
                fontSize: '1.25rem',
                fontFamily: 'Outfit',
                borderRadius: '14px',
                boxShadow: 'none',
                backgroundColor: !isOperator 
                  ? ((theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff')
                  : undefined,
                borderColor: !isOperator 
                  ? ((theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0')
                  : undefined,
                '&:hover': {
                  backgroundColor: isOperator 
                    ? 'primary.dark' 
                    : ((theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f8fafc'),
                }
              }}
            >
              {btn}
            </Button>
          );
        })}
        <Button
          variant="outlined"
          color="error"
          onClick={() => handleKeyPress('backspace')}
          sx={{
            gridColumn: 'span 2',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
          }}
        >
          <BackspaceOutlinedIcon />
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleKeyPress('backspace')}
          sx={{
            gridColumn: 'span 1',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
          }}
        >
          C
        </Button>
      </Box>
    </Paper>
  );
}
