import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
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

const PriceHistory = () => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0].url) throw new Error('No URL found');

        const response = await fetch(
          `http://localhost:8000/api/history?url=${encodeURIComponent(tabs[0].url)}`
        );
        if (!response.ok) throw new Error('Failed to fetch price history');

        const data = await response.json();
        setPriceHistory(data.history);

        if (data.history.length > 0) {
          const prices = data.history.map((point) => point.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          setStats({ minPrice, maxPrice, avgPrice });
        }

        setError(null);
      } catch (err) {
        setError('Error fetching price history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
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

  if (!priceHistory.length) {
    return (
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          boxShadow: 2,
          '& .MuiAlert-icon': { fontSize: '1.5rem' },
        }}
      >
        No price history available yet
      </Alert>
    );
  }

  const chartData = {
    labels: priceHistory.map((point) =>
      new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Price History',
        data: priceHistory.map((point) => point.price),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
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
          label: (context) => `Price: $${context.parsed.y.toFixed(2)}`,
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
          Price History
        </Typography>

        {stats && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Lowest: ${stats.minPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average: ${stats.avgPrice.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Highest: ${stats.maxPrice.toFixed(2)}
              </Typography>
            </Box>
            <Divider />
          </Box>
        )}

        <Box sx={{ height: 300, mt: 2 }}>
          <Line data={chartData} options={chartOptions} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriceHistory;
