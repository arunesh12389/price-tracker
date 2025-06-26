import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/* global chrome */

const PricePrediction = () => {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0].url) throw new Error('No URL found');

        const response = await fetch(
          `http://localhost:8000/api/predict?url=${encodeURIComponent(tabs[0].url)}`
        );
        if (!response.ok) throw new Error('Failed to fetch predictions');

        const data = await response.json();
        setPredictionData(data);
        setError(null);
      } catch (err) {
        setError('Error fetching price predictions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <Card sx={{ minWidth: 275, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        {error}
      </Alert>
    );
  }

  if (!predictionData) {
    return (
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        No prediction data available
      </Alert>
    );
  }

  const chartData = {
    labels: predictionData.predictions.map((point) =>
      new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Price Prediction',
        data: predictionData.predictions.map((point) => point.price),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context) => `Predicted: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `$${value.toFixed(2)}`,
        },
      },
    },
  };

  return (
    <Card
      sx={{
        minWidth: 275,
        boxShadow: 3,
        borderRadius: 2,
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.3s ease-in-out',
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Price Prediction
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Chip
              icon={
                predictionData.recommendation === 'buy' ? (
                  <TrendingDownIcon />
                ) : (
                  <TrendingUpIcon />
                )
              }
              label={`Recommendation: ${predictionData.recommendation.toUpperCase()}`}
              color={predictionData.recommendation === 'buy' ? 'success' : 'warning'}
              sx={{ fontWeight: 500 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Confidence:
              </Typography>
              <Box sx={{ width: 100 }}>
                <LinearProgress
                  variant="determinate"
                  value={predictionData.confidence * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {Math.round(predictionData.confidence * 100)}%
              </Typography>
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" paragraph>
              {predictionData.insights.trend}
            </Typography>
            <Typography variant="body2" paragraph>
              {predictionData.insights.volatility}
            </Typography>
            <Typography variant="body2">
              {predictionData.insights.bestTime}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PricePrediction;
