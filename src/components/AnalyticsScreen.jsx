// src/components/AnalyticsScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, StatArrow, HStack, VStack, Spinner, Flex, Tooltip } from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function AnalyticsScreen({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [trendData, setTrendData] = useState([])
  const [summary, setSummary] = useState({ totalRev: 0, growth: 0 })

  useEffect(() => {
    calculateTrends()
  }, [])

  const calculateTrends = async () => {
    try {
      const salesSnap = await getDocs(collection(db, "sales"))
      const salesByMonth = {} // Format: { "Jan 2025": 50000, "Feb 2025": 75000 }

      let totalRevenue = 0

      // 1. Group Sales by Month
      salesSnap.forEach(doc => {
        const data = doc.data()
        const amount = data.totalAmount || 0
        const date = data.createdAt ? data.createdAt.toDate() : new Date()
        
        // Create Key: e.g., "Dec 2025"
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
        
        if (!salesByMonth[monthKey]) salesByMonth[monthKey] = 0
        salesByMonth[monthKey] += amount
        totalRevenue += amount
      })

      // 2. Convert to Array for Sorting
      // We want the last 6 months specifically
      const monthsOrder = []
      const today = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = d.toLocaleString('default', { month: 'short', year: 'numeric' })
        monthsOrder.push(key)
      }

      const finalData = monthsOrder.map(key => ({
        month: key,
        amount: salesByMonth[key] || 0
      }))

      // 3. Calculate Growth (Last Month vs This Month)
      const thisMonth = finalData[5].amount
      const lastMonth = finalData[4].amount
      let growthPercent = 0
      if (lastMonth > 0) {
        growthPercent = ((thisMonth - lastMonth) / lastMonth) * 100
      } else if (thisMonth > 0) {
        growthPercent = 100 // 100% growth if started from 0
      }

      setTrendData(finalData)
      setSummary({ totalRev: totalRevenue, growth: growthPercent })

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Find max value to scale the bars graphically
  const maxVal = Math.max(...trendData.map(d => d.amount)) || 1

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <Button onClick={onBack} mb={6}>← Back to Dashboard</Button>
      <Heading mb={2} color="purple.700">Business Trends 📈</Heading>
      <Text color="gray.500" mb={8}>6-Month Performance Overview</Text>

      {/* SUMMARY CARDS */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
        <Box p={5} bg="white" shadow="md" borderRadius="xl" borderTop="4px solid" borderColor="purple.500">
          <Stat>
            <StatLabel>Lifetime Revenue</StatLabel>
            <StatNumber>TZS {summary.totalRev.toLocaleString()}</StatNumber>
          </Stat>
        </Box>
        <Box p={5} bg="white" shadow="md" borderRadius="xl" borderTop="4px solid" borderColor={summary.growth >= 0 ? "green.500" : "red.500"}>
          <Stat>
            <StatLabel>Growth (vs Last Month)</StatLabel>
            <StatNumber>
              <StatArrow type={summary.growth >= 0 ? 'increase' : 'decrease'} />
              {summary.growth.toFixed(1)}%
            </StatNumber>
            <Text fontSize="xs" color="gray.500">Month-over-Month trend</Text>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* VISUAL BAR CHART */}
      <Box bg="white" p={8} borderRadius="2xl" shadow="lg">
        <Heading size="md" mb={6}>Revenue History (Last 6 Months)</Heading>
        
        <Flex 
          alignItems="flex-end" 
          justifyContent="space-between" 
          height="300px" 
          w="100%" 
          borderBottom="2px solid" 
          borderColor="gray.200"
          pb={2}
        >
          {trendData.map((item, index) => {
            // Calculate height percentage (max 100%)
            const height = (item.amount / maxVal) * 100
            
            return (
              <VStack key={index} spacing={2} flex={1} alignItems="center">
                {/* TOOLTIP ON HOVER TO SEE EXACT NUMBER */}
                <Tooltip label={`TZS ${item.amount.toLocaleString()}`} hasArrow placement='top'>
                  <Box 
                    w={{ base: "30px", md: "50px" }}
                    h={`${height}%`} 
                    bgGradient="linear(to-t, purple.500, cyan.400)"
                    borderRadius="md"
                    transition="all 0.3s"
                    _hover={{ opacity: 0.8, transform: "scaleY(1.05)" }}
                    minH={item.amount > 0 ? "4px" : "0"}
                  />
                </Tooltip>
                <Text fontSize="xs" fontWeight="bold" color="gray.600" transform={{ base: "rotate(-45deg)", md: "none" }} mt={2}>
                  {item.month}
                </Text>
              </VStack>
            )
          })}
        </Flex>
      </Box>

      <Box mt={8} p={4} bg="blue.50" borderRadius="lg">
        <Heading size="sm" color="blue.700">💡 Business Insight</Heading>
        <Text fontSize="sm" mt={2}>
          {summary.growth > 0 
            ? "Great job! Your business is trending upwards compared to last month. Keep pushing sales!"
            : "Sales have dipped slightly this month. Check your 'Monthly Archives' to see if expenses were higher or sales volume dropped."
          }
        </Text>
      </Box>
    </Box>
  )
}