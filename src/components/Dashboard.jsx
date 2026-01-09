// src/components/DashboardScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Heading, Text, Card, CardBody, Flex, Spinner, Progress, Icon, VStack, HStack,
  Select, Badge
} from '@chakra-ui/react'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
// Icons
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertCircle } from 'react-icons/fi'

export default function DashboardScreen({ onNavigate }) {
  const [loading, setLoading] = useState(true)
  
  // Financial Data
  const [totalSales, setTotalSales] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalWastage, setTotalWastage] = useState(0)
  const [netProfit, setNetProfit] = useState(0)
  
  // Stock Alerts
  const [lowStockItems, setLowStockItems] = useState([])
  
  // Filter State (Default to This Month)
  const [timeRange, setTimeRange] = useState('month') // 'all', 'month', 'today'

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 1. Define Time Filter
      const now = new Date()
      let startDate = new Date('2000-01-01') // Default: All time
      
      if (timeRange === 'month') {
        // First day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (timeRange === 'today') {
        // Start of today
        startDate = new Date(now.setHours(0,0,0,0))
      }

      // 2. Fetch Sales
      const salesSnap = await getDocs(collection(db, 'sales'))
      let salesSum = 0
      salesSnap.forEach(doc => {
        const data = doc.data()
        // Convert string date to Date object for comparison
        if (new Date(data.date) >= startDate) {
           salesSum += Number(data.totalAmount) || 0
        }
      })

      // 3. Fetch Expenses (includes Raw Material Restocks if auto-logged)
      const expSnap = await getDocs(collection(db, 'expenses'))
      let expSum = 0
      expSnap.forEach(doc => {
        const data = doc.data()
        if (new Date(data.date) >= startDate) {
            expSum += Number(data.amount) || 0
        }
      })

      // 4. Fetch Wastage (Money lost to sorting/bad peanuts)
      // Note: We need to calculate Value (Qty * Cost)
      const wasteSnap = await getDocs(collection(db, 'wastage'))
      let wasteSum = 0
      wasteSnap.forEach(doc => {
        const data = doc.data()
        if (new Date(data.date) >= startDate) {
            // If you saved 'cost' in wastage, use it. Otherwise assume 0 for now.
            // Assuming your wastage collection has a 'totalValue' or 'cost' field
            wasteSum += Number(data.totalValue || data.cost || 0)
        }
      })

      // 5. Fetch Low Stock (Inventory)
      const invSnap = await getDocs(collection(db, 'inventory'))
      const lowStock = []
      invSnap.forEach(doc => {
        const item = doc.data()
        // Alert if stock is less than 20 units (You can change this number)
        if (Number(item.currentStock) < 20) {
            lowStock.push({ name: item.name, stock: item.currentStock })
        }
      })

      // 6. Set States
      setTotalSales(salesSum)
      setTotalExpenses(expSum)
      setTotalWastage(wasteSum)
      setNetProfit(salesSum - (expSum + wasteSum))
      setLowStockItems(lowStock)

    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- HELPERS FOR COLOR ---
  const profitColor = netProfit >= 0 ? "green.500" : "red.500"
  const profitIcon = netProfit >= 0 ? FiTrendingUp : FiTrendingDown

  if (loading) return <Flex justify="center" p={10}><Spinner size="xl" /></Flex>

  return (
    <Box p={5} maxW="1600px" mx="auto">
      
      {/* HEADER & FILTER */}
      <Flex justifyContent="space-between" alignItems="center" mb={6} flexDirection={{ base: 'column', md: 'row' }} gap={4}>
        <VStack align="flex-start" spacing={0}>
            <Heading size="lg" color="teal.700">Business Overview</Heading>
            <Text color="gray.500">How is the business performing?</Text>
        </VStack>
        <Select w="200px" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} bg="white">
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
        </Select>
      </Flex>

      {/* 1. FINANCIAL CARDS */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        
        {/* REVENUE CARD */}
        <Card borderTop="4px solid" borderColor="green.400" boxShadow="md">
            <CardBody>
                <Stat>
                    <StatLabel fontSize="lg" color="gray.500">Total Sales</StatLabel>
                    <Flex alignItems="center">
                        <Icon as={FiDollarSign} w={6} h={6} color="green.500" mr={2} />
                        <StatNumber fontSize="3xl">{totalSales.toLocaleString()}</StatNumber>
                    </Flex>
                    <StatHelpText>Money collected from customers</StatHelpText>
                </Stat>
            </CardBody>
        </Card>

        {/* EXPENSE CARD */}
        <Card borderTop="4px solid" borderColor="red.400" boxShadow="md">
            <CardBody>
                <Stat>
                    <StatLabel fontSize="lg" color="gray.500">Total Costs</StatLabel>
                    <Flex alignItems="center">
                        <Icon as={FiTrendingDown} w={6} h={6} color="red.500" mr={2} />
                        <StatNumber fontSize="3xl">{(totalExpenses + totalWastage).toLocaleString()}</StatNumber>
                    </Flex>
                    <StatHelpText>
                        Expenses: {totalExpenses.toLocaleString()} <br/> 
                        Wastage: {totalWastage.toLocaleString()}
                    </StatHelpText>
                </Stat>
            </CardBody>
        </Card>

        {/* PROFIT CARD */}
        <Card bg={netProfit >= 0 ? "green.50" : "red.50"} border="1px solid" borderColor={netProfit >= 0 ? "green.200" : "red.200"} boxShadow="md">
            <CardBody>
                <Stat>
                    <StatLabel fontSize="lg" fontWeight="bold" color={netProfit >= 0 ? "green.700" : "red.700"}>
                        NET PROFIT
                    </StatLabel>
                    <Flex alignItems="center">
                        <StatArrow type={netProfit >= 0 ? 'increase' : 'decrease'} />
                        <StatNumber fontSize="3xl" color={profitColor}>
                            {netProfit.toLocaleString()} TZS
                        </StatNumber>
                    </Flex>
                    <StatHelpText fontWeight="bold">
                        {netProfit >= 0 ? "You are making money! 🚀" : "You are losing money. ⚠️"}
                    </StatHelpText>
                </Stat>
            </CardBody>
        </Card>
      </SimpleGrid>

      {/* 2. LOWER SECTION: STOCK ALERTS & ACTIONS */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        
        {/* LOW STOCK ALERT */}
        <Card variant="outline">
            <CardBody>
                <Heading size="md" mb={4} display="flex" alignItems="center">
                    <Icon as={FiAlertCircle} color="orange.500" mr={2} />
                    Low Stock Alerts
                </Heading>
                {lowStockItems.length === 0 ? (
                    <Text color="green.500" bg="green.50" p={2} borderRadius="md">✅ All stock levels are good.</Text>
                ) : (
                    <VStack align="stretch" spacing={2}>
                        {lowStockItems.map((item, index) => (
                            <HStack key={index} justify="space-between" p={2} bg="orange.50" borderRadius="md">
                                <Text fontWeight="bold">{item.name}</Text>
                                <Badge colorScheme="red">Only {item.stock} left</Badge>
                            </HStack>
                        ))}
                    </VStack>
                )}
            </CardBody>
        </Card>

        {/* QUICK ACTIONS */}
        <Card variant="outline">
            <CardBody>
                <Heading size="md" mb={4}>Quick Actions</Heading>
                <SimpleGrid columns={2} spacing={4}>
                    <Button h="60px" colorScheme="teal" onClick={() => onNavigate('sales')}>
                        New Sale
                    </Button>
                    <Button h="60px" colorScheme="blue" variant="outline" onClick={() => onNavigate('production')}>
                        Record Production
                    </Button>
                    <Button h="60px" colorScheme="orange" variant="outline" onClick={() => onNavigate('raw_materials')}>
                        Restock Materials
                    </Button>
                    <Button h="60px" colorScheme="red" variant="outline" onClick={() => onNavigate('expenses')}>
                        Add Expense
                    </Button>
                </SimpleGrid>
            </CardBody>
        </Card>

      </SimpleGrid>
    </Box>
  )
}