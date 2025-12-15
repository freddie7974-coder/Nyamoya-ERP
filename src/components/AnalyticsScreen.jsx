// src/components/AnalyticsScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, SimpleGrid, Text, Heading, HStack, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Spinner, Divider, Card, CardBody, VStack, Progress, Badge } from '@chakra-ui/react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function AnalyticsScreen({ onBack }) {
  const [loading, setLoading] = useState(true)
  
  // Financial Data
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCOGS, setTotalCOGS] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  
  // Transaction Counts
  const [totalSalesCount, setTotalSalesCount] = useState(0)
  const [expenseCount, setExpenseCount] = useState(0)

  useEffect(() => {
    fetchFinancials()
  }, [])

  const fetchFinancials = async () => {
    try {
      // 1. Fetch Sales (Revenue & COGS)
      const salesSnap = await getDocs(collection(db, "sales"))
      let revenue = 0
      let cogs = 0
      let salesCount = 0

      salesSnap.forEach(doc => {
        const data = doc.data()
        revenue += data.totalAmount || 0
        // 🛡️ Safety: If old sales don't have cost, assume 0 (or estimation)
        cogs += data.totalCost || 0 
        salesCount++
      })

      // 2. Fetch Expenses (Rent, Salary, etc.)
      const expensesSnap = await getDocs(collection(db, "expenses"))
      let expenses = 0
      let expCount = 0

      expensesSnap.forEach(doc => {
        const data = doc.data()
        expenses += data.amount || 0
        expCount++
      })

      setTotalRevenue(revenue)
      setTotalCOGS(cogs)
      setTotalExpenses(expenses)
      setTotalSalesCount(salesCount)
      setExpenseCount(expCount)

    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // 🧮 CALCULATIONS
  const grossProfit = totalRevenue - totalCOGS
  const netProfit = grossProfit - totalExpenses
  
  // Profit Margin Calculation (Avoid division by zero)
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={8}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="purple.600">Financial Performance 📈</Heading>
      </HStack>

      {/* 1. HERO SECTION: NET PROFIT */}
      <Box 
        bg={netProfit >= 0 ? "green.500" : "red.500"} 
        p={6} 
        borderRadius="xl" 
        color="white" 
        mb={8} 
        shadow="lg"
        textAlign="center"
      >
        <Text fontSize="lg" fontWeight="medium" opacity={0.9}>NET PROFIT (Real Cash)</Text>
        <Heading size="3xl" my={2}>TZS {netProfit.toLocaleString()}</Heading>
        <Text fontSize="sm" opacity={0.8}>
          {netProfit >= 0 ? "You are making money! 🤑" : "You are currently losing money. 📉"}
        </Text>
      </Box>

      {/* 2. KEY METRICS GRID */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
        
        {/* REVENUE CARD */}
        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="gray.500">Total Revenue (Sales)</StatLabel>
              <StatNumber color="blue.600">TZS {totalRevenue.toLocaleString()}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                {totalSalesCount} Transactions
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* COGS CARD */}
        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="gray.500">Cost of Goods Sold</StatLabel>
              <StatNumber color="orange.500">TZS {totalCOGS.toLocaleString()}</StatNumber>
              <StatHelpText>
                Raw Materials & Production
              </StatHelpText>
            </Stat>
            <Box mt={2}>
              <Text fontSize="xs" color="gray.500" mb={1}>Cost Ratio ({100 - Math.round(grossMargin)}%)</Text>
              <Progress value={100 - grossMargin} colorScheme="orange" size="xs" borderRadius="full" />
            </Box>
          </CardBody>
        </Card>

        {/* EXPENSES CARD */}
        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="gray.500">Operating Expenses</StatLabel>
              <StatNumber color="red.500">TZS {totalExpenses.toLocaleString()}</StatNumber>
              <StatHelpText>
                Rent, Utilities, Salaries
              </StatHelpText>
            </Stat>
            <Box mt={2}>
              <Text fontSize="xs" color="gray.500" mb={1}>{expenseCount} Records Logged</Text>
              <Progress value={(totalExpenses / totalRevenue) * 100} colorScheme="red" size="xs" borderRadius="full" />
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Divider mb={8} />

      {/* 3. PROFITABILITY BREAKDOWN */}
      <Heading size="sm" mb={4} color="gray.600">Profitability Health</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        
        {/* Gross Profit Box */}
        <Box p={5} borderWidth="1px" borderRadius="lg" bg="white">
          <HStack justifyContent="space-between" mb={2}>
            <Text fontWeight="bold" color="gray.700">Gross Profit</Text>
            <Badge colorScheme="green" fontSize="0.8em">{Math.round(grossMargin)}% Margin</Badge>
          </HStack>
          <Heading size="lg" color="green.600">TZS {grossProfit.toLocaleString()}</Heading>
          <Text fontSize="sm" color="gray.500" mt={2}>
            (Sales - Cost of Jars). This covers your factory efficiency.
          </Text>
        </Box>

        {/* Net Profit Box */}
        <Box p={5} borderWidth="1px" borderRadius="lg" bg="white">
          <HStack justifyContent="space-between" mb={2}>
            <Text fontWeight="bold" color="gray.700">Net Profit</Text>
            <Badge colorScheme={netMargin > 15 ? "green" : netMargin > 0 ? "yellow" : "red"} fontSize="0.8em">
              {Math.round(netMargin)}% Margin
            </Badge>
          </HStack>
          <Heading size="lg" color={netProfit >= 0 ? "teal.600" : "red.500"}>
            TZS {netProfit.toLocaleString()}
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={2}>
            (Gross Profit - Expenses). This is your take-home amount.
          </Text>
        </Box>

      </SimpleGrid>
    </Box>
  )
}